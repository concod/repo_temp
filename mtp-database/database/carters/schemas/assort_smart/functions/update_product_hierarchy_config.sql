--liquibase formatted sql
--changeset srinivasgowda.sg@impactanalytics.co liquibase:update_product_hierarchy_config runOnChange:true  stripComments:false splitStatements:false context:MTP-75018 labels:liquibase_project_start
--comment: update_product_hierarchy_config 
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort_smart.update_product_hierarchy_config();
CREATE OR REPLACE FUNCTION assort_smart.update_product_hierarchy_config()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    _inserted_count integer;
BEGIN
    INSERT INTO assort_smart.product_hierarchy_config 
    (levels, store_levels, season_code, planning_path, optimization_threshold, starting_level, optimization_level, final_level)
    WITH 
    product_levels AS (
        SELECT DISTINCT
            l0_name,
            l3_name,
            CASE 
                WHEN l3_name LIKE '%BOYS PLAYWEAR%' OR 
                     l3_name LIKE '%GIRLS PLAYWEAR%' OR 
                     l3_name LIKE '%LITTLE PLANET%' OR 
                     l3_name LIKE '%SLEEPWEAR%'
                THEN true
                ELSE false
            END AS special_category,
            CASE
                WHEN l3_name LIKE '%BOYS PLAYWEAR%' OR 
                     l3_name LIKE '%GIRLS PLAYWEAR%' OR 
                     l3_name LIKE '%LITTLE PLANET%' OR 
                     l3_name LIKE '%SLEEPWEAR%'
                THEN jsonb_build_object(
                    'l0_name', l0_name,
                    'l3_name', l3_name,
                    'age', COALESCE(age, '')
                )
                ELSE jsonb_build_object(
                    'l0_name', l0_name,
                    'l3_name', l3_name
                )
            END AS levels
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
        WHERE 
            season_end_date >= '2023-01-01'::date
    )
    SELECT 
        p.levels,
        s.store_levels,
        rs.season_code,
        ARRAY['l0_name', 'l3_name', 'age', 'gender', 'l5_name']::varchar[] AS planning_path,
        '80%' AS optimization_threshold,
        CASE 
            WHEN p.special_category 
            THEN ARRAY['l0_name', 'l3_name', 'age']::varchar[]
            ELSE ARRAY['l0_name', 'l3_name']::varchar[]
        END AS starting_level,
        CASE 
            WHEN p.special_category 
            THEN ARRAY['age']::varchar[]
            ELSE NULL
        END AS optimization_level,
        ARRAY['l5_name']::varchar[] AS final_level
    FROM 
        product_levels p
    CROSS JOIN 
        store_levels s
    CROSS JOIN
        relevant_seasons rs
    ON CONFLICT (levels, store_levels, season_code) DO NOTHING;
        
    -- Get the count of inserted rows for logging purposes
    GET DIAGNOSTICS _inserted_count = ROW_COUNT;
    
    RAISE NOTICE 'Carter product hierarchy configuration created successfully. Inserted % rows.', _inserted_count;
END;
$$;