--liquibase formatted sql
--changeset liquibase:build_store_hierarchies_filter_2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for build_store_hierarchies_filter_2
--rollback: SELECT 1
DROP PROCEDURE if exists global.build_store_hierarchies_filter();
CREATE OR REPLACE PROCEDURE global.build_store_hierarchies_filter()
LANGUAGE plpgsql
SECURITY DEFINER
AS $procedure$
DECLARE
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'global.build_store_hierarchies_filter';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
    _attr text;
    _hl int;
    _jsonb_cols text[];
    _h_sqls text[];
    _h_cols text[];
    _combine_sql text;
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    SET work_mem = '2GB';

    -- Drop temp table if it exists (suppress warning)
    BEGIN
        EXECUTE 'DROP TABLE store_hierarchies_filter_temp';
    EXCEPTION
        WHEN undefined_table THEN NULL;
    END;

    -- Loop through store hierarchy attributes
    FOR _attr, _hl IN
        SELECT generic_column_name, hierarchy_level
        FROM global.store_generic_schema_mapping
        WHERE required_in_product AND is_hierarchy
        ORDER BY hierarchy_level ASC
    LOOP
        _jsonb_cols := array_append(_jsonb_cols, '''' || _attr || '''');
        _jsonb_cols := array_append(_jsonb_cols, '(CASE WHEN ' || _attr || ' IS NULL THEN ''-'' ELSE ' || _attr || ' END)');
        _h_cols := array_append(_h_cols, _attr);
        _h_sqls := array_append(_h_sqls, 
            'SELECT JSONB_BUILD_OBJECT(' || array_to_string(_jsonb_cols, ', ') || ') AS path, ' || 
            _hl || ' AS level FROM global.store_attributes_filter GROUP BY ' || array_to_string(_h_cols, ', '));
    END LOOP;

    -- Validate that _h_sqls is not empty
    IF array_length(_h_sqls, 1) IS NULL THEN
        RAISE EXCEPTION 'No hierarchy levels found in store_generic_schema_mapping!';
    END IF;

    -- Generate dynamic SQL for creating the temp table
    _combine_sql := '
        CREATE TEMP TABLE store_hierarchies_filter_temp AS
        SELECT x.path, x.level
        FROM (' || array_to_string(_h_sqls, ' UNION ALL ') || ') X
        GROUP BY 1, 2;';

    -- Execute the dynamic SQL
    EXECUTE _combine_sql;

    -- Insert into expired_stores table
    INSERT INTO global.expired_stores 
    SELECT t1.path, t1.level
    FROM global.store_hierarchies_filter t1
    JOIN store_hierarchies_filter_temp t2
        ON t1.path->>'store_code' = t2.path->>'store_code'
        AND t1.level = t2.level
        AND t1.path IS DISTINCT FROM t2.path
    WHERE t1.path->>'store_code' IS NOT NULL
        AND t1.active = true;

    -- Update existing hierarchy_codes if changes detected
    UPDATE global.store_hierarchies_filter t1
    SET path = t2.path, updated_at = now()
    FROM store_hierarchies_filter_temp t2
    WHERE t1.path->>'store_code' = t2.path->>'store_code'
        AND t1.level = t2.level
        AND t1.path IS DISTINCT FROM t2.path
        AND t1.path->>'store_code' IS NOT NULL
        AND t1.active = true;

    -- Insert remaining records, resolving conflicts properly
    INSERT INTO global.store_hierarchies_filter("path", "level")
    SELECT "path", "level"
    FROM store_hierarchies_filter_temp
    ON CONFLICT("path", "level") DO UPDATE 
    SET active = excluded.active
    WHERE excluded."path" NOT IN (
        SELECT t1.path
        FROM global.store_hierarchies_filter t1
        JOIN store_hierarchies_filter_temp t2
            ON t1.path->>'store_code' = t2.path->>'store_code'
            AND t1.level = t2.level
            AND t1.path = t2.path
        WHERE t1.path->>'store_code' IS NOT NULL
            AND t1.active = true
    );

    -- Deactivate records no longer in hierarchy
    UPDATE global.store_hierarchies_filter 
    SET active = false, updated_at = now()
    WHERE hierarchy_code IN (
        SELECT hierarchy_code
        FROM global.store_hierarchies_filter t1
        LEFT JOIN store_hierarchies_filter_temp t2 USING("path", "level")
        WHERE t1.active = true
        AND t2.path IS NULL
    );

    -- Drop the temp table at the end
    DROP TABLE IF EXISTS store_hierarchies_filter_temp;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END
$procedure$;
