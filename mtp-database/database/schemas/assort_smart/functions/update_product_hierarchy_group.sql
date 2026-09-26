--liquibase formatted sql
--changeset srinivasgowda.sg@impactanalytics.co:create_product_hierarchy_group runOnChange:true stripComments:false splitStatements:false context:update_product_hierarchy_group labels:liquibase_project_start
--comment: Create function for update product hierarchy group

DROP FUNCTION IF EXISTS assort_smart.update_product_hierarchy_group();

CREATE OR REPLACE FUNCTION assort_smart.update_product_hierarchy_group()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    WITH hierarchy_data AS (
        -- Level 1 hierarchies (l0_name only)
        SELECT 
            REPLACE('l0_name_' || l0_name, ' ', '_') AS hierarchy_code,
            jsonb_build_object('l0_name', l0_name) AS path,
            1 AS level,
            TRUE AS active
        FROM 
            "global".product_attributes_filter
        WHERE 
            l0_name IS NOT NULL
        GROUP BY 
            l0_name
        
        UNION ALL
        
        -- Level 2 hierarchies
        SELECT 
            REPLACE('l0_name_' || l0_name || '_l1_name_' || l1_name, ' ', '_') AS hierarchy_code,
            jsonb_build_object('l0_name', l0_name, 'l1_name', l1_name) AS path,
            2 AS level,
            TRUE AS active
        FROM 
            "global".product_attributes_filter
        WHERE 
            l0_name IS NOT NULL AND l1_name IS NOT NULL
        GROUP BY 
            l0_name, l1_name
        
        UNION ALL
        
        -- Level 3 hierarchies
        SELECT 
            REPLACE('l0_name_' || l0_name || '_l1_name_' || l1_name || '_l2_name_' || l2_name, ' ', '_') AS hierarchy_code,
            jsonb_build_object('l0_name', l0_name, 'l1_name', l1_name, 'l2_name', l2_name) AS path,
            3 AS level,
            TRUE AS active
        FROM 
            "global".product_attributes_filter
        WHERE 
            l0_name IS NOT NULL AND l1_name IS NOT NULL AND l2_name IS NOT NULL
        GROUP BY 
            l0_name, l1_name, l2_name
        
        UNION ALL
        
        -- Level 4 hierarchies
        SELECT 
            REPLACE('l0_name_' || l0_name || '_l1_name_' || l1_name || '_l2_name_' || l2_name || '_l3_name_' || l3_name, ' ', '_') AS hierarchy_code,
            jsonb_build_object('l0_name', l0_name, 'l1_name', l1_name, 'l2_name', l2_name, 'l3_name', l3_name) AS path,
            4 AS level,
            TRUE AS active
        FROM 
            "global".product_attributes_filter
        WHERE 
            l0_name IS NOT NULL AND l1_name IS NOT NULL AND l2_name IS NOT NULL AND l3_name IS NOT NULL
        GROUP BY 
            l0_name, l1_name, l2_name, l3_name
    )
    INSERT INTO assort_smart. product_hierarchy_group (hierarchy_code, path, level, active)
    SELECT hierarchy_code, path, level, active FROM hierarchy_data
    ON CONFLICT (hierarchy_code) DO UPDATE 
    SET updated_at = now();
        
   -- RAISE NOTICE 'Product hierarchy group populated successfully';
END;
$function$
;
