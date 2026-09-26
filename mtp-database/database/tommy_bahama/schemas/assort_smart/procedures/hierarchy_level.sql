-- liquibase formatted sql
-- changeset liquibase:changes_for_tenant_hierarchy_level runOnChange:true stripComments:false splitStatements:false context:MTP-81362 labels:chnages_for_hierarchy_level
-- comment: changes for hierarchy table with levels

DROP PROCEDURE IF EXISTS global.tenant_hierarchy_level();

CREATE OR REPLACE PROCEDURE global.tenant_hierarchy_level()
 LANGUAGE plpgsql
AS $procedure$
DECLARE
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'global.tenant_hierarchy_level';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
    result RECORD;
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    -- Delete existing data from the target table
    DELETE FROM global.tenant_hierarchy_levels;

    FOR result IN
            WITH raw_data AS (
			SELECT
                (COALESCE(l1_name, 'OTHERS')) AS l1_name,
                (COALESCE(l2_name, 'OTHERS')) AS l2_name,
                (COALESCE(l3_name, 'OTHERS')) AS l3_name,
                (coalesce(s1_name, 'OTHERS')) AS s1_name
            FROM
                global.product_attributes_filter
                cross join
        		(select distinct(s1_name) as s1_name FROM "global".store_attributes_filter) as s
            GROUP BY
                l1_name, l2_name, l3_name,s1_name
        ),
        d AS (
            SELECT *, ROW_NUMBER() OVER () - 1 AS hierarchy_level_id
            FROM raw_data
        ),
        product as
        (SELECT d.hierarchy_level_id, p.hierarchy_level, p.hierarchy_value
        FROM d
        CROSS JOIN LATERAL (
            VALUES
                ('l1_name', l1_name),
                ('l2_name', l2_name),
                ('l3_name', l3_name),
                ('s1_name', s1_name)
        ) AS p(hierarchy_level, hierarchy_value))
        select hierarchy_level_id, hierarchy_level, hierarchy_value from product
    LOOP
        -- Insert the result into the 45fg table
        INSERT INTO global.tenant_hierarchy_levels (hierarchy_level_id, hierarchy_level, hierarchy_value)
        VALUES (result.hierarchy_level_id, result.hierarchy_level, result.hierarchy_value);
    END LOOP;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$procedure$
;