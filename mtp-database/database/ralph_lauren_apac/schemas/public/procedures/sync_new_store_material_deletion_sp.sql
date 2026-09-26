--liquibase formatted sql
--changeset pooja.shekar:added sp for missing part of new store setup for deletion runOnChange:true stripComments:false splitStatements:false context:Ralph_Lauren_InventorySmart labels:MTP-68395
--comment: 	added sp for missing part of new store setup for deletion
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_new_store_material_deletion_sp();
CREATE OR REPLACE PROCEDURE public.sync_new_store_material_deletion_sp()
LANGUAGE plpgsql
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_new_store_material_deletion_sp';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    -- Step 1: Materialize "insert_cte" into a temporary table
    CREATE TEMP TABLE temp_insert_cte AS
    WITH cte1 AS (
        SELECT 
            store_code,
            store_group,
            sister_store_code,
            array_agg(DISTINCT CASE WHEN attribute_name = 'l0_name' THEN value END) AS l0_name,
            array_agg(DISTINCT CASE WHEN attribute_name = 'l1_name' THEN value END) AS l1_name,
            array_agg(DISTINCT CASE WHEN attribute_name = 'l2_name' THEN value END) AS l2_name,
            array_agg(DISTINCT CASE WHEN attribute_name = 'l3_name' THEN value END) AS l3_name,
            array_agg(DISTINCT CASE WHEN attribute_name = 'l4_name' THEN value END) AS l4_name
        FROM (
            SELECT 
                store_code,
                store_group,
                sister_store_code,
                hierarchies,
                element->>'attribute_name' AS attribute_name,
                jsonb_array_elements_text(element->'values') AS value
            FROM (
                SELECT 
                    store_code,
                    unnest(COALESCE(store_groups, ARRAY[]::varchar[])) AS store_group,
                    sister_store_code,
                    hierarchies
                FROM (
                    SELECT 
                        a.*, 
                        b.sister_store_code, 
                        b.hierarchies
                    FROM 
                        "global".new_store_data a
                    JOIN 
                        "global".new_store_mapping b 
                    USING (store_code)
                ) AS foo
            ) AS foo1,
            jsonb_array_elements(hierarchies) AS element
        ) AS foo3
        GROUP BY store_code, store_group, sister_store_code
    ),
    cte2 AS (
        SELECT DISTINCT 
            ph_code, channel, default_store_groups, default_store_groups_selected, 
            store_group_ph_config, l0_name, l1_name, l2_name, l3_name, l4_name, article
        FROM (
            SELECT 
                foo1.* 
            FROM (
                SELECT 
                    foo.*,
                    path->>'article' AS article,
                    path->>'l0_name' AS l0_name,
                    path->>'l1_name' AS l1_name,
                    path->>'l2_name' AS l2_name,
                    path->>'l3_name' AS l3_name,
                    path->>'l4_name' AS l4_name
                FROM (
                    SELECT *, 
                        unnest(COALESCE(default_store_groups_selected, ARRAY[]::INT[])) AS store_group_ph_config
                    FROM "inventory_smart".ph_configuration_mapping
                ) AS foo 
                JOIN "global".product_hierarchies_filter b
                ON ph_code = hierarchy_code 
            ) AS foo1 
        ) AS foo2
    )
    SELECT DISTINCT 
        a.store_code,
        a.store_group,
        a.sister_store_code,
        b.ph_code,
        b.channel,
        b.default_store_groups_selected,
        c.retail_facility_code,
        c.open_date,
        d.sg_code
    FROM cte1 a
    JOIN cte2 b
        ON a.store_group::integer = b.store_group_ph_config
        AND b.l0_name = ANY(a.l0_name) 
        AND b.l1_name = ANY(a.l1_name) 
        AND b.l2_name = ANY(a.l2_name) 
        AND b.l3_name = ANY(a.l3_name) 
        AND b.l4_name = ANY(a.l4_name)
    JOIN "global".store_attributes_filter c
        USING(store_code)
    LEFT JOIN "global".store_groups_mapping d
        USING(store_code)
    WHERE c.open_date <= current_date;

    -- Step 2: Add index to the temporary table to improve performance
    CREATE INDEX idx_temp_insert_cte_ph_channel ON temp_insert_cte (ph_code, channel);

    -- Step 3: Perform the update using the temporary table
    UPDATE "inventory_smart".ph_configuration_mapping pcm
    SET default_store_groups_selected = ARRAY(
        SELECT unnest(pcm.default_store_groups_selected) 
        EXCEPT SELECT temp_insert_cte.sg_code::int4 
    )
    FROM temp_insert_cte
    WHERE pcm.ph_code = temp_insert_cte.ph_code
      AND pcm.channel = temp_insert_cte.channel;

    -- Temporary tables are automatically dropped when the session ends, so we do not need an explicit DROP.
    -- No explicit cleanup required here.

		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$procedure$;
