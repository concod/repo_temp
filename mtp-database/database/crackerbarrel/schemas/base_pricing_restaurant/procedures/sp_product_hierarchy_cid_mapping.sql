--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:sp_product_hierarchy_cid_mapping_1 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.sp_product_hierarchy_cid_mapping_1

DROP PROCEDURE IF EXISTS base_pricing_restaurant.sp_product_hierarchy_cid_mapping;


CREATE OR REPLACE PROCEDURE base_pricing_restaurant.sp_product_hierarchy_cid_mapping()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    v_max_level INT;
    v_sql TEXT;
    v_union_all TEXT := '';
    v_level_rec RECORD;
BEGIN
    -- Check if the table exists and truncate it
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'base_pricing_restaurant' AND tablename = 'bp_product_hierarchy_cid_mapping') THEN
        TRUNCATE TABLE base_pricing_restaurant.bp_product_hierarchy_cid_mapping;
    END IF;
    
    -- Get the maximum hierarchy level from configuration
    SELECT MAX(product_hierarchy_level_id) INTO v_max_level 
    FROM base_pricing_restaurant.bp_product_hierarchy_level;
    
    -- Check if we found any hierarchy levels
    IF v_max_level IS NULL THEN
        RAISE EXCEPTION 'No hierarchy levels found in base_pricing_restaurant.bp_product_hierarchy_level';
    END IF;
    
    RAISE NOTICE 'Maximum hierarchy level: %', v_max_level;
    
    -- Build dynamic SQL for each level
    FOR v_level_rec IN 
        SELECT product_hierarchy_level_id as hierarchy_level
        FROM base_pricing_restaurant.bp_product_hierarchy_level 
        ORDER BY hierarchy_level
    LOOP
        IF v_level_rec.hierarchy_level > 0 THEN
            v_union_all := v_union_all || ' UNION ALL ';
        END IF;
        
        v_union_all := v_union_all || 
            'SELECT ' || v_level_rec.hierarchy_level || ' AS hierarchy_level, ' ||
            'l' || v_level_rec.hierarchy_level || '_cid AS hierarchy_value, ' ||
            'l' || v_level_rec.hierarchy_level || '_cuq AS hierarchy_name ' ||
            'FROM base_pricing_restaurant.bp_product_master ' ||
            'GROUP BY l' || v_level_rec.hierarchy_level || '_cid, l' || v_level_rec.hierarchy_level || '_cuq';
            
        RAISE NOTICE 'Added level % to union query', v_level_rec.hierarchy_level;
    END LOOP;

    -- Display the UNION ALL query for debugging
    RAISE NOTICE 'Generated UNION ALL query: %', v_union_all;
    
    -- Build the final SQL
    v_sql := '
    INSERT INTO base_pricing_restaurant.bp_product_hierarchy_cid_mapping (hierarchy_level, hierarchy_value, hierarchy_name)
    SELECT DISTINCT
        hierarchy_level,
        hierarchy_value,
        hierarchy_name
    FROM (' || v_union_all || ') dd
    WHERE hierarchy_value IS NOT NULL
    ON CONFLICT (hierarchy_level, hierarchy_value) DO NOTHING;';
    
    -- Display the final query for debugging
    RAISE NOTICE 'Final SQL query to be executed: %', v_sql;
    
    -- Execute the dynamic SQL to insert records
    EXECUTE v_sql;
    
    -- Get the count of inserted records
    GET DIAGNOSTICS v_max_level = ROW_COUNT;
    RAISE NOTICE 'Inserted % records into bp_product_hierarchy_cid_mapping', v_max_level;
    
END;
$procedure$
;