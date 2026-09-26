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
        -- Level 1 hierarchies (l1_name only)
        SELECT 
            REPLACE('l1_name_' || l1_name, ' ', '_') AS hierarchy_code,
            jsonb_build_object('l1_name', l1_name) AS path,
            1 AS level,
            TRUE AS active
        FROM 
            "global".product_attributes_filter
        WHERE 
            l1_name IS NOT NULL
        GROUP BY 
            l1_name
        
        UNION ALL
        
        -- Level 2 hierarchies
        SELECT 
            REPLACE('l1_name_' || l1_name || '_l2_name_' || l2_name, ' ', '_') AS hierarchy_code,
            jsonb_build_object('l1_name', l1_name, 'l2_name', l2_name) AS path,
            2 AS level,
            TRUE AS active
        FROM 
            "global".product_attributes_filter
        WHERE 
            l1_name IS NOT NULL AND l2_name IS NOT NULL
        GROUP BY 
            l1_name, l2_name
        
        UNION ALL
        
        -- Level 3 hierarchies
        SELECT 
            REPLACE('l1_name_' || l1_name || '_l2_name_' || l2_name || '_l3_name_' || l3_name, ' ', '_') AS hierarchy_code,
            jsonb_build_object('l1_name', l1_name, 'l2_name', l2_name, 'l3_name', l3_name) AS path,
            3 AS level,
            TRUE AS active
        FROM 
            "global".product_attributes_filter
        WHERE 
            l1_name IS NOT NULL AND l2_name IS NOT NULL AND l3_name IS NOT NULL
        GROUP BY 
            l1_name, l2_name, l3_name
        
        UNION ALL
        
        -- Level 6 hierarchies
        SELECT 
            REPLACE('l1_name_' || l1_name || '_l2_name_' || l2_name || '_l3_name_' || l3_name || '_l6_name_' || l6_name, ' ', '_') AS hierarchy_code,
            jsonb_build_object('l1_name', l1_name, 'l2_name', l2_name, 'l3_name', l3_name, 'l6_name', l6_name) AS path,
            6 AS level,
            TRUE AS active
        FROM 
            "global".product_attributes_filter
        WHERE 
            l1_name IS NOT NULL AND l2_name IS NOT NULL AND l3_name IS NOT NULL AND l6_name IS NOT NULL
        GROUP BY 
            l1_name, l2_name, l3_name, l6_name
        
        UNION ALL
        
        -- Level 7 hierarchies
        SELECT 
            REPLACE('l1_name_' || l1_name || '_l2_name_' || l2_name || '_l3_name_' || l3_name || '_l6_name_' || l6_name || '_l7_name_' || l7_name, ' ', '_') AS hierarchy_code,
            jsonb_build_object('l1_name', l1_name, 'l2_name', l2_name, 'l3_name', l3_name, 'l6_name', l6_name, 'l7_name', l7_name) AS path,
            7 AS level,
            TRUE AS active
        FROM 
            "global".product_attributes_filter
        WHERE 
            l1_name IS NOT NULL AND l2_name IS NOT NULL AND l3_name IS NOT NULL AND l6_name IS NOT NULL AND l7_name IS NOT NULL
        GROUP BY 
            l1_name, l2_name, l3_name, l6_name, l7_name

        union all 

        SELECT 
            REPLACE('l1_name_' || l1_name || '_l2_name_' || l2_name || '_l3_name_' || l3_name || '_l6_name_' || l6_name || '_l7_name_' || l7_name || '_l8_name_' || l8_name, ' ', '_') AS hierarchy_code,
            jsonb_build_object('l1_name', l1_name, 'l2_name', l2_name, 'l3_name', l3_name, 'l6_name', l6_name, 'l7_name', l7_name, 'l8_name', l8_name) AS path,
            8 AS level,
            TRUE AS active
        FROM 
            "global".product_attributes_filter
        WHERE 
            l1_name IS NOT NULL AND l2_name IS NOT NULL AND l3_name IS NOT NULL AND l6_name IS NOT NULL AND l7_name IS NOT NULL and l8_name is not null 
        GROUP BY 
            l1_name, l2_name, l3_name, l6_name, l7_name, l8_name

    )
    INSERT INTO assort_smart.product_hierarchy_group (hierarchy_code, path, level, active)
    SELECT hierarchy_code, path, level, active FROM hierarchy_data
    ON CONFLICT (hierarchy_code) DO UPDATE 
    SET updated_at = now();
        
   RAISE NOTICE 'Product hierarchy group populated successfully';
END;
$function$
;
