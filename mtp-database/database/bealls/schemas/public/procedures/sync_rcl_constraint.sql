--liquibase formatted sql
--changeset ujjawal.singh@impactanalytics.co:sync_rcl_constraint_02 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_rcl_constraint_01
--rollback: SELECT 1



DROP PROCEDURE IF EXISTS public.sync_rcl_constraint();
CREATE OR REPLACE PROCEDURE public.sync_rcl_constraint()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_rcl_constraint';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
    _rcl_code int;
    _rcl_dt text;
    _rcl_jsonb text;
    _sql text;
BEGIN
	-- Log procedure start
	CALL global.data_ingestion_logs(_log_code, _sp_name, 'start', NULL, (clock_timestamp() - _st)::text, NULL);
	PERFORM set_config('local.log_code', _log_code, TRUE);
	PERFORM set_config('local.sp_name', _sp_name, TRUE);

	BEGIN
        -- Step 1: Insert into global.rcl_master
        WITH cte AS (
            SELECT * 
            FROM (
                SELECT 
                    array_agg(rcl_dimension ORDER BY rcl_dimension)::varchar[] AS level, 
                    rcl_code 
                FROM (
                    SELECT 
                        jsonb_object_keys(
                            concat(
                                '{"',
                                replace(
                                    replace(rcl_dimension, '::', '":"'),
                                    ';;', '","'
                                ),
                                '"}'
                            )::jsonb
                        ) AS rcl_dimension, 
                        rcl_code
                    FROM public.constraint_master 
                    GROUP BY 1,2
                ) b 
                GROUP BY 2
            ) r
            JOIN global.rcl_priority_mapping rpm USING(level) 
            WHERE module_code = 170
        )
        INSERT INTO global.rcl_master 
        SELECT 
            rcl_code, 
            170, 
            "level", 
            '{}', 
            '{[2022-07-01,2050-12-31)}', 
            rcl_priority, 
            FALSE, 
            1, 
            NULL, 
            NOW(), 
            NULL
        FROM cte 
        ON CONFLICT DO NOTHING;

        -- Step 2: Loop over RCL codes
        FOR _rcl_code, _rcl_dt, _rcl_jsonb IN 
            SELECT 
                x.rcl_code, 
                string_agg(x.level || ' ' || y.generic_column_datatype, ', '), 
                string_agg(quote_literal(x.level) || ', ' || x.level, ', ') 
            FROM (
                SELECT 
                    rcl_code, 
                    unnest(level) AS level 
                FROM global.rcl_master
            ) x 
            JOIN global.product_generic_schema_mapping y 
                ON x.level = y.generic_column_name 
            GROUP BY 1
        LOOP

            -- Step 3: Create temp table with explicit casts (FIX HERE)
            EXECUTE '
                CREATE TEMP TABLE rcl_constraint_master_rule_' || _rcl_code || ' ON COMMIT DROP AS
                SELECT
                    rcl_code,
                    rule_name,
                    psa_code,
                    psa_name,
                    daterange(start_date, end_date) AS validity,
                    wos::real AS wos,         -- ✅ Casted to real
                    min::real AS min,         -- ✅ Casted to real
                    max::real AS max,         -- ✅ Casted to real
                    jsonb_build_object(' || _rcl_jsonb || ') AS rcl_dimension 
                FROM (
                    SELECT 
                        concat(
                            ''{"'',
                            replace(
                                replace(rcl_dimension, ''::'', ''":"''), 
                                '';;'', ''","''
                            ),
                            ''"}''
                        )::jsonb AS rcl_dimension,
                        rcl_code,
                        rule_name,
                        psa_code,
                        psa_name,
                        start_date::date AS start_date,
                        end_date::date AS end_date,
                        wos,
                        min,
                        max
                    FROM public.constraint_master
                    WHERE rcl_code = ' || _rcl_code || '
                ) x, 
                jsonb_to_record(rcl_dimension) AS (' || _rcl_dt || ');
            ';

            -- Step 4: Insert into rcl_constraint_master_rule
            EXECUTE '
                INSERT INTO inventory_smart.rcl_constraint_master_rule (
                    rcl_code, 
                    rule_name, 
                    rcl_dimension
                )
                SELECT
                    rcl_code,
                    rule_name,
                    rcl_dimension
                FROM
                    rcl_constraint_master_rule_' || _rcl_code || '
                ON CONFLICT DO NOTHING;
            ';

            -- Step 5: Insert into rcl_constraint_master
            EXECUTE '
                INSERT INTO inventory_smart.rcl_constraint_master (
                    rcl_code,
                    rule_code,
                    psa_code,
                    psa_name,
                    validity,
                    wos,
                    min_stock,
                    max_stock
                )
                SELECT
                    rcl_code,
                    rule_code,
                    psa_code,
                    psa_name,
                    validity,
                    wos,
                    min,
                    max
                FROM rcl_constraint_master_rule_' || _rcl_code || ' x
                JOIN inventory_smart.rcl_constraint_master_rule y
                    USING(rcl_code, rcl_dimension)
                ON CONFLICT DO NOTHING;
            ';
        END LOOP;

		-- Log success
		CALL global.data_ingestion_logs(_log_code, _sp_name, 'end', NULL, (clock_timestamp() - _st)::text, NULL);

	EXCEPTION
		WHEN OTHERS THEN
	        -- Log and raise error if something fails
	        CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, NULL);
            RAISE EXCEPTION 'Error occurred in the procedure: %', SQLERRM;
	END;
END
$procedure$;

