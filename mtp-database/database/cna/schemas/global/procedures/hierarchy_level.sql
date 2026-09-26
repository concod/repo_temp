-- liquibase formatted sql
-- changeset liquibase:Hierarchy_level_changes_for_level runOnChange:true stripComments:false splitStatements:false context:MTP-63016 labels:Hierarchy_level_changes_for_levels
-- comment: Changed a hierarchy table with levels and corresponding values for level
drop procedure if exists global.tenant_hierarchy_level();
-- Create the new procedure

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
    
    -- Delete existing data from the target table
    DELETE FROM global.tenant_hierarchy_levels;

	begin

    FOR result IN

        WITH raw_data AS (
            SELECT
                COALESCE(l0_name,'OTHERS') AS l0_name,
                COALESCE(l1_name,'OTHERS') AS l1_name,
                COALESCE(l2_name,'OTHERS') AS l2_name,
                COALESCE(l3_name,'OTHERS') AS l3_name,
                COALESCE(l4_name,'OTHERS') AS l4_name,
                COALESCE(l5_name,'OTHERS') AS l5_name,
                COALESCE(l8_name,'OTHERS') AS l8_name
            FROM global.product_attributes_filter paf
            GROUP BY
                l0_name,
                l1_name,
                l2_name,
                l3_name,
                l4_name,
                l5_name,
                l8_name
        ),

        d AS (
            SELECT *, ROW_NUMBER() OVER () - 1 AS hierarchy_level_id
            FROM raw_data
        )

        SELECT
            d.hierarchy_level_id,
            p.hierarchy_level,
            p.hierarchy_value
        FROM d
        CROSS JOIN LATERAL (
            VALUES
                ('l0_name', l0_name),
                ('l1_name', l1_name),
                ('l2_name', l2_name),
                ('l3_name', l3_name),
                ('l4_name', l4_name),
                ('l5_name', l5_name),
                ('l8_name', l8_name)
        ) AS p(hierarchy_level, hierarchy_value)

    LOOP

        INSERT INTO global.tenant_hierarchy_levels
        (hierarchy_level_id, hierarchy_level, hierarchy_value)
        VALUES
        (result.hierarchy_level_id, result.hierarchy_level, result.hierarchy_value);

    END LOOP;

	call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);

	exception
		when others then
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;

	end;

END;
$procedure$
;