--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:sp_product_hierarchy_cid_mapping_v1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: sp_product_hierarchy_cid_mapping_v1

DROP PROCEDURE IF EXISTS base_pricing.sp_product_hierarchy_cid_mapping();

CREATE OR REPLACE PROCEDURE base_pricing.sp_product_hierarchy_cid_mapping()
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
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'base_pricing' AND tablename = 'bp_product_hierarchy_cid_mapping') THEN
        TRUNCATE TABLE base_pricing.bp_product_hierarchy_cid_mapping;
    END IF;
    
    -- Get the maximum hierarchy level from configuration
    SELECT MAX(product_hierarchy_level_id) INTO v_max_level 
    FROM base_pricing.bp_product_hierarchy_level;
    
    -- Check if we found any hierarchy levels
    IF v_max_level IS NULL THEN
        RAISE EXCEPTION 'No hierarchy levels found in base_pricing.bp_product_hierarchy_level';
    END IF;
    
    -- Build dynamic SQL for each level
    FOR v_level_rec IN 
        SELECT product_hierarchy_level_id as hierarchy_level
        FROM base_pricing.bp_product_hierarchy_level 
        ORDER BY hierarchy_level
    LOOP
        IF v_level_rec.hierarchy_level > 0 THEN
            v_union_all := v_union_all || ' UNION ALL ';
        END IF;
        
        v_union_all := v_union_all || 
            'SELECT ' || v_level_rec.hierarchy_level || ' AS hierarchy_level, ' ||
            'l' || v_level_rec.hierarchy_level || '_cid AS hierarchy_value, ' ||
            'l' || v_level_rec.hierarchy_level || '_cuq AS hierarchy_name ' ||
            'FROM base_pricing.bp_product_master ' ||
            'GROUP BY l' || v_level_rec.hierarchy_level || '_cid, l' || v_level_rec.hierarchy_level || '_cuq';
    END LOOP;
    
    -- Execute the dynamic SQL to insert records
    v_sql := '
    INSERT INTO base_pricing.bp_product_hierarchy_cid_mapping (hierarchy_level, hierarchy_value, hierarchy_name)
    SELECT DISTINCT
        hierarchy_level,
        hierarchy_value,
        hierarchy_name
    FROM (' || v_union_all || ') dd
    ON CONFLICT (hierarchy_level, hierarchy_value) DO NOTHING;';
    
    EXECUTE v_sql;
END;
$procedure$
;
