--liquibase formatted sql
--changeset Shaik.Azmathulla@impactanalytics.co:create_partitions_for_paf runOnChange:true stripComments:false splitStatements:false context:generate_all_rcl_constraint_data labels:project start
--comment: created procedure create_partitions_for_paf
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS global.create_partitions_for_paf();

CREATE OR REPLACE PROCEDURE global.create_partitions_for_paf( _tb text)
LANGUAGE plpgsql
AS $procedure$
DECLARE
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'global.create_partitions_for_paf';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
   -- _tb text := 'product_attributes_filter';
    _query text;
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin

    -- Drop temp table if exists
    DROP TABLE IF EXISTS product_attributes_temp;

    -- Create temp table with aggregated attributes
    CREATE TEMP TABLE product_attributes_temp AS 
    SELECT l0.l0_name, l1.l1_name
    FROM global.product_master pm
    LEFT JOIN (
        SELECT product_code, attribute_value::varchar AS l0_name
        FROM global.product_attributes
        WHERE attribute_name = 'l0_name'
    ) l0 USING (product_code)
    LEFT JOIN (
        SELECT product_code, attribute_value::varchar AS l1_name
        FROM global.product_attributes
        WHERE attribute_name = 'l1_name'
    ) l1 USING (product_code)
    GROUP BY l0.l0_name, l1.l1_name;

    -- Loop through generated partition creation queries
    FOR _query IN 
        WITH map AS (
            SELECT  
                l0_name, l1_name,
                EXISTS (
                    SELECT 1 
                    FROM pg_catalog.pg_class c
                    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
                    WHERE n.nspname = 'global'
                      AND c.relname = _tb || '_' || lower(regexp_replace(paf.l0_name, '\W+', '', 'g'))
                ) AS l0_part,
                EXISTS (
                    SELECT 1
                    FROM pg_catalog.pg_class c
                    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
                    WHERE n.nspname = 'global'
                      AND c.relname = _tb || '_' || lower(regexp_replace(paf.l0_name, '\W+', '', 'g')) || '_' || lower(regexp_replace(paf.l1_name, '\W+', '', 'g'))
                ) AS l1_part
            FROM (
                SELECT l0_name, l1_name
                FROM product_attributes_temp
                GROUP BY 1, 2
                ORDER BY 1, 2
            ) paf
        )
        SELECT 'CREATE TABLE IF NOT EXISTS "global".product_attributes_filter_default PARTITION OF "global".product_attributes_filter DEFAULT ;' as query
        UNION ALL
        SELECT 
            CASE WHEN NOT l0_part THEN 
                'CREATE TABLE IF NOT EXISTS global.' || _tb || '_' || lower(regexp_replace(l0_name, '\W+', '', 'g')) ||
                ' PARTITION OF global.' || _tb || ' FOR VALUES IN (' || quote_literal(l0_name) || ') PARTITION BY LIST (l1_name);' 
            ELSE '' END AS query
        FROM map
        WHERE NOT l0_part
        GROUP BY 1
        UNION ALL
        SELECT
            CASE WHEN NOT l1_part THEN
                'CREATE TABLE IF NOT EXISTS global.' || _tb || '_' || lower(regexp_replace(l0_name, '\W+', '', 'g')) || '_' || lower(regexp_replace(l1_name, '\W+', '', 'g')) ||
                ' PARTITION OF global.' || _tb || '_' || lower(regexp_replace(l0_name, '\W+', '', 'g')) || ' FOR VALUES IN (' || quote_literal(l1_name) || ');'
            ELSE '' END AS query
        FROM map
        WHERE NOT l1_part
        GROUP BY 1
    LOOP
        RAISE NOTICE '_query: %', _query;
        IF _query <> '' THEN
            EXECUTE _query;
        END IF;
    END LOOP;

		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$procedure$;