--liquibase formatted sql
--changeset mayank.bhardwaj@impactanalytics.co liquibase:update_product_hierarchy_config_changes runOnChange:true  stripComments:false splitStatements:false context:MTP-75018 labels:liquibase_project_start
--comment: update_product_hierarchy_config_sp 
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort_smart.update_product_hierarchy_config();
CREATE OR REPLACE FUNCTION assort_smart.update_product_hierarchy_config()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    _inserted_count integer;
BEGIN
    INSERT INTO assort_smart.product_hierarchy_config
    (levels, store_levels, season_code, planning_path, optimization_threshold, starting_level, optimization_level, final_level)

    WITH 
    product_levels AS (
        SELECT DISTINCT
            jsonb_build_object(
                'l0_name', l0_name,
                'l1_name', l1_name,
                'l2_name', l2_name,
                'l3_name', l3_name,
                'l4_name', l4_name,
                'l5_name', l5_name,
                'l8_name', l8_name
            ) AS levels
        FROM "global".product_attributes_filter
        WHERE active = true AND is_deleted = false
    ),

    store_levels AS (
        SELECT DISTINCT
            jsonb_build_object(
                'channel', channel
            ) AS store_levels
        FROM "global".store_attributes_filter
        WHERE active = true AND is_deleted = false
    ),

    relevant_seasons AS (
        SELECT 
            season_code::varchar AS season_code,
            name AS season_name
        FROM "global".season_master
        WHERE season_end_date >= '2023-01-01'::date
    ),

    constants AS (
        SELECT
            ARRAY[
                'l0_name','l1_name','l2_name','l3_name','l4_name','l5_name','l8_name'
            ]::varchar[] AS planning_path,

            ARRAY[
                'l0_name','l1_name','l2_name','l3_name','l4_name'
            ]::varchar[] AS starting_level,

            ARRAY[
                'l8_name'
            ]::varchar[] AS final_level
    )

    SELECT 
        p.levels,
        s.store_levels,
        rs.season_code,
        c.planning_path,
        '80%' AS optimization_threshold,
        c.starting_level,
        ARRAY['l5_name'] AS optimization_level,
        c.final_level
    FROM 
        product_levels p
    CROSS JOIN 
        store_levels s
    CROSS JOIN
        relevant_seasons rs
    CROSS JOIN
        constants c

    ON CONFLICT (levels, store_levels, season_code) DO NOTHING;

    GET DIAGNOSTICS _inserted_count = ROW_COUNT;

    RAISE NOTICE 
    'Product hierarchy configuration created successfully. Inserted % rows.',
    _inserted_count;

END;
$function$
;