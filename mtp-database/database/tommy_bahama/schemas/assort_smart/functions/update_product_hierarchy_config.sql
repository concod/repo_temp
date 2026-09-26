--liquibase formatted sql
--changeset srinivasgowda.sg@impactanalytics.co:update_product_hierarchy_config runOnChange:true stripComments:false splitStatements:false context:product_hierarchy_config labels:liquibase_project_start
--comment: Create function for product hierarchy config

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
        SELECT 
           
            l1_name,
            l2_name,
            l3_name
        FROM "global".product_attributes_filter
        WHERE active = true AND is_deleted = false
        GROUP BY 
            l1_name,
            l2_name,
            l3_name
    ),
    store_levels AS (
        SELECT 
            channel,
            jsonb_build_object(
                'channel', channel
            ) AS store_levels
        FROM "global".store_attributes_filter
        WHERE active = true AND is_deleted = false
        GROUP BY  channel
    ),
    seasons AS (
        SELECT 
            season_code::varchar AS season_code,
            name AS season_name
        FROM "global".season_master
--        WHERE 
--            -- Season end date is after 2023-01-01
--            season_end_date >= '2023-01-01'::date
    ),
    combined_data AS (
        SELECT 
         
            s.store_levels,
            ss.season_code,
           
            p.l1_name,
            p.l2_name,
            p.l3_name,
            s.channel,
            CASE
                WHEN s.channel LIKE 'DTG%'  AND (p.l1_name LIKE '%Footwear'AND p.l2_name LIKE '%Footwear') THEN ARRAY[ 'l1_name', 'l2_name']::varchar[]
                WHEN s.channel LIKE 'WSFP%' OR s.channel LIKE 'WSOP%' THEN ARRAY[ 'l1_name', 'l2_name']::varchar[]
                ELSE ARRAY[ 'l1_name', 'l2_name', 'l3_name']::varchar[]
            END AS planning_path,
            CASE
                WHEN (p.l1_name LIKE '%Home' OR p.l1_name LIKE '%Footwear') AND s.channel LIKE 'OUT%' THEN ARRAY[ 'l1_name']::varchar[]
                WHEN  s.channel LIKE 'WSFP%' OR s.channel LIKE 'WSOP%' THEN ARRAY[ 'l1_name']::varchar[]
                WHEN  p.l1_name LIKE '%Footwear' AND s.channel LIKE 'DTG%'  THEN 
                    CASE
                        WHEN p.l2_name LIKE '%Footwear'  THEN ARRAY[ 'l1_name', 'l2_name']::varchar[]
                        ELSE ARRAY[ 'l1_name', 'l2_name', 'l3_name']::varchar[]
                    END
                ELSE 
                    ARRAY[ 'l1_name', 'l2_name']::varchar[]
            END AS starting_level,
            CASE
                WHEN s.channel LIKE 'OUT%' AND (p.l1_name LIKE '%Home' OR p.l1_name LIKE '%Footwear') THEN ARRAY['l2_name']::varchar[]
                ELSE NULL
            END AS optimization_level
        FROM 
            product_levels p
        CROSS JOIN 
            store_levels s
        CROSS JOIN
            seasons ss
    )
    SELECT 
        case WHEN array_length(cd.starting_level, 1) = 1 THEN jsonb_build_object(
                'l1_name', l1_name
            )
            WHEN array_length(cd.starting_level, 1) = 2 THEN jsonb_build_object(
                'l1_name', l1_name,
                'l2_name', l2_name
                
            )
           ELSE jsonb_build_object(
                'l1_name', l1_name,
                'l2_name', l2_name,
                'l3_name', l3_name
            )
         end as levels,
        cd.store_levels,
        cd.season_code,
        cd.planning_path,
        '80%' AS optimization_threshold,
        cd.starting_level,
        cd.optimization_level,
        -- Final level is the last element of planning_path
        CASE
            WHEN array_length(cd.planning_path, 1) = 3 THEN ARRAY['l3_name']::varchar[]
            WHEN array_length(cd.planning_path, 1) = 2 THEN ARRAY['l2_name']::varchar[]
            ELSE NULL
        END AS final_level
    FROM 
        combined_data cd
    ON CONFLICT (levels, store_levels, season_code) DO NOTHING;
        
    -- Get the count of inserted rows for logging purposes
    --GET DIAGNOSTICS _inserted_count = ROW_COUNT;
    
    --RAISE NOTICE 'Product hierarchy configuration populated successfully. Inserted % rows.', _inserted_count;
END;
$function$
;