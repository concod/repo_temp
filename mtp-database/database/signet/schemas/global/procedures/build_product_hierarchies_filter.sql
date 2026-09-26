--liquibase formatted sql
--changeset srinivasgowda.sg@impactanalytics.co:apf runOnChange:true stripComments:false splitStatements:false context:paf labels:liquibase_project_start
--comment: paf

DROP PROCEDURE IF EXISTS "global".build_product_hierarchies_filter();

CREATE OR REPLACE PROCEDURE global.build_product_hierarchies_filter()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'global.build_product_hierarchies_filter';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
    _attr text;
    _hl int;
    _jsonb_cols text[];
    _h_sqls text[];
    _h_cols text[];
    _combine_sql text;
    _new_records_count INTEGER;
    _available_ids_count INTEGER;
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	set work_mem = '10GB';
    
    -- Build the hierarchy SQL as before
    for _attr, _hl in
        select
            generic_column_name,
            hierarchy_level
        from
            "global".product_generic_schema_mapping
        where
            required_in_product and is_hierarchy
        order by
            hierarchy_level asc loop
        _jsonb_cols := array_append(_jsonb_cols, '''' || _attr || '''');
        _jsonb_cols := array_append(_jsonb_cols, '(CASE WHEN ' || _attr || ' IS NULL THEN ''-'' ELSE ' || _attr || ' END)');
        _h_cols := array_append(_h_cols, _attr);
        _h_sqls := array_append(_h_sqls, 'select JSONB_BUILD_OBJECT(' || (array_to_string(_jsonb_cols, ', ', '')) || ') as path, ' || _hl || ' AS level from global.product_attributes_filter GROUP BY ' || (array_to_string(_h_cols, ', ', '')));
    end loop;
    
    _combine_sql := '
        CREATE TEMP TABLE product_hierarchies_filter_temp AS
        SELECT
          x.path,
          x.level
        FROM (' || array_to_string(_h_sqls, ' UNION ALL ', '') || ') X
        GROUP BY 1,2;';
        
	raise notice '_combine_sql: %', _combine_sql;
    DROP TABLE IF EXISTS product_hierarchies_filter_temp;
    execute _combine_sql;

    -- **NEW: Calculate how many new records we'll need hierarchy_codes for**
    SELECT COUNT(*) INTO _new_records_count
    FROM product_hierarchies_filter_temp;
    
    RAISE NOTICE 'New records needing hierarchy_codes: %', _new_records_count;

perform public.populate_available_hierarchy_codes_simple(_new_records_count);
    
    -- **NEW: Check available hierarchy_codes pool**
    SELECT COUNT(*) INTO _available_ids_count
    FROM inventory_smart.available_hierarchy_codes 
    WHERE used = FALSE;
    
    RAISE NOTICE 'Available hierarchy_codes in pool: %', _available_ids_count;
    
    -- **NEW: Populate more hierarchy_codes if needed**
    IF _available_ids_count < _new_records_count THEN
        RAISE NOTICE 'Populating additional hierarchy_codes...';

        
      
        
        RAISE NOTICE 'Available hierarchy_codes after population: %', _available_ids_count;
    END IF;
    
    -- **NEW: Create temp table with pre-assigned hierarchy_codes for new records**
    DROP TABLE IF EXISTS temp_new_records_with_ids;
    CREATE TEMP TABLE temp_new_records_with_ids AS
    WITH new_records AS (
        SELECT temp.path, temp.level,
               ROW_NUMBER() OVER (ORDER BY temp.path, temp.level) as rn
        FROM product_hierarchies_filter_temp temp
    ),
    available_ids AS (
        SELECT hierarchy_code,
               ROW_NUMBER() OVER (ORDER BY hierarchy_code) as rn
        FROM inventory_smart.available_hierarchy_codes 
        WHERE used = FALSE
        LIMIT (SELECT COUNT(*) FROM new_records)
    )
    SELECT nr.path, nr.level, ai.hierarchy_code
    FROM new_records nr
    JOIN available_ids ai ON nr.rn = ai.rn;
    
    RAISE NOTICE 'Pre-assigned hierarchy_codes for % new records', (SELECT COUNT(*) FROM temp_new_records_with_ids);

    -- Existing logic for expired products
    insert into global.expired_products 
          SELECT t1."path", t1."level"
          FROM global.product_hierarchies_filter t1
          join product_hierarchies_filter_temp t2
          on t1.path->>'product_code' = t2.path->>'product_code'
          and t1.level = t2.level
          and t1.path != t2.path
          WHERE t1.path->>'product_code' IS NOT NULL
              AND t1.active = true;

    -- Existing update logic
    UPDATE global.product_hierarchies_filter t1
    SET path = t2.path, updated_at = now()
    FROM product_hierarchies_filter_temp t2
    WHERE t1.path->>'product_code' = t2.path->>'product_code'
    and t1.level = t2.level
    and t1.path != t2.path
    and t1.path->>'product_code' is not null
    and t1.active = true;

    -- **MODIFIED: Insert new records using pre-assigned hierarchy_codes**
    INSERT INTO global.product_hierarchies_filter(hierarchy_code, "path", "level") 
    SELECT 
        tnr.hierarchy_code,
        tnr."path", 
        tnr."level" 
    FROM temp_new_records_with_ids tnr
    ON CONFLICT("path", "level") DO UPDATE 
    SET active = true, updated_at = now()
    WHERE excluded."path" NOT IN (
        SELECT t1.path
        FROM global.product_hierarchies_filter t1
        JOIN product_hierarchies_filter_temp t2
        ON t1.path->>'product_code' = t2.path->>'product_code'
        AND t1.level = t2.level
        AND t1.path = t2.path
        WHERE t1.path->>'product_code' IS NOT NULL
        AND t1.active = true
    );

    -- **NEW: Mark used hierarchy_codes as used**
    UPDATE inventory_smart.available_hierarchy_codes 
    SET used = TRUE, reserved_at = CURRENT_TIMESTAMP
    WHERE hierarchy_code IN (
        SELECT hierarchy_code FROM temp_new_records_with_ids
    );

    -- Existing deactivation logic
    UPDATE global.product_hierarchies_filter 
    SET active = false, updated_at = now() 
    WHERE hierarchy_code IN (
        SELECT hierarchy_code 
        FROM global.product_hierarchies_filter t1 
        LEFT JOIN product_hierarchies_filter_temp t2 using("path", "level") 
        WHERE t1.active = true 
        AND t2."path" is null
    );
    
    -- Cleanup
    DROP TABLE IF EXISTS product_hierarchies_filter_temp;
    DROP TABLE IF EXISTS temp_new_records_with_ids;
    
    RAISE NOTICE 'Procedure completed successfully';
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
end
$procedure$
;
