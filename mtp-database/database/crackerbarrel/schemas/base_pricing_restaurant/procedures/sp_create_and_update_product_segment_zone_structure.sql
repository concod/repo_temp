--liquibase formatted sql
--changeset yashraj.jha@impactanalytics.co:sp_create_and_update_product_segment_zone_structure_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for sp_create_and_update_product_segment_zone_structure_1

DROP PROCEDURE IF EXISTS base_pricing_restaurant.sp_create_and_update_product_segment_zone_structure;

CREATE OR REPLACE PROCEDURE base_pricing_restaurant.sp_create_and_update_product_segment_zone_structure()
 LANGUAGE plpgsql
AS $procedure$
DECLARE
    v_max_zone_level INT;
    v_rows_inserted INT;
    v_rows_updated INT;
    v_hierarchy_conditions TEXT := '';
    i INT;
BEGIN
    -- Step 1: Insert new product-segment combinations for usable = true products
    INSERT INTO base_pricing_restaurant.bp_product_customer_segment_prices (
        product_id,
        segment_id,
        zone_structure_id
    )
    SELECT 
        p.product_id,
        s.segment_id,
        NULL as zone_structure_id
    FROM 
        (SELECT DISTINCT product_id FROM base_pricing_restaurant.bp_product_master WHERE usable = TRUE) p
    CROSS JOIN 
        (SELECT segment_id FROM base_pricing_restaurant.bp_customer_segment_master WHERE is_active = TRUE) s
    WHERE NOT EXISTS (
        SELECT 1 
        FROM base_pricing_restaurant.bp_product_customer_segment_prices existing
        WHERE existing.product_id = p.product_id
        AND existing.segment_id = s.segment_id
    );
    
    GET DIAGNOSTICS v_rows_inserted = ROW_COUNT;
    RAISE NOTICE 'Inserted % new product-segment combinations', v_rows_inserted;
    
    -- Step 2: Find highest zone mapping level
    SELECT MAX(product_hierarchy_level_id) 
    INTO v_max_zone_level
    FROM base_pricing_restaurant.bp_product_hierarchy_level 
    WHERE is_zone_mapping_view_by = TRUE;
    
    -- If no zone mapping level is found, exit early
    IF v_max_zone_level IS NULL THEN
        RAISE NOTICE 'No zone mapping level found. Exiting procedure.';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Highest zone mapping level: %', v_max_zone_level;
    
    -- Step 3: Build hierarchy conditions for matching
    FOR i IN 0..v_max_zone_level LOOP
        IF v_hierarchy_conditions != '' THEN
            v_hierarchy_conditions := v_hierarchy_conditions || ' AND ';
        END IF;
        v_hierarchy_conditions := v_hierarchy_conditions || 
            'new_pm.l' || i || '_cid = ref_pm.l' || i || '_cid';
    END LOOP;
    
    RAISE NOTICE 'Hierarchy conditions: %', v_hierarchy_conditions;
    
    -- Step 4: Update zone_structure_id for newly inserted rows
    -- Find matching product-segment pairs based on hierarchy AND segment
    -- ONLY update if the reference has a NON-NULL zone_structure_id
    EXECUTE FORMAT('
        WITH matching_pairs AS (
            SELECT DISTINCT ON (new_pcs.product_id, new_pcs.segment_id)
                new_pcs.product_id as new_product_id,
                new_pcs.segment_id,
                ref_pcs.zone_structure_id,
                ref_pcs.product_id as reference_product_id
            FROM base_pricing_restaurant.bp_product_customer_segment_prices new_pcs
            INNER JOIN base_pricing_restaurant.bp_product_master new_pm 
                ON new_pcs.product_id = new_pm.product_id
                AND new_pm.usable = TRUE
            -- Find other usable products with same hierarchy
            INNER JOIN base_pricing_restaurant.bp_product_master ref_pm ON %s
                AND ref_pm.usable = TRUE
                AND new_pm.product_id != ref_pm.product_id
            --Match the SAME segment_id
            INNER JOIN base_pricing_restaurant.bp_product_customer_segment_prices ref_pcs
                ON ref_pm.product_id = ref_pcs.product_id
                AND new_pcs.segment_id = ref_pcs.segment_id  -- Same segment!
            WHERE new_pcs.zone_structure_id IS NULL
                --Only update if reference has a NON-NULL zone_structure_id
                AND ref_pcs.zone_structure_id IS NOT NULL
            ORDER BY new_pcs.product_id, new_pcs.segment_id, ref_pm.product_id
        )
        UPDATE base_pricing_restaurant.bp_product_customer_segment_prices target_pcs
        SET zone_structure_id = mp.zone_structure_id
        FROM matching_pairs mp
        WHERE target_pcs.product_id = mp.new_product_id
            AND target_pcs.segment_id = mp.segment_id
            AND target_pcs.zone_structure_id IS NULL',
        v_hierarchy_conditions);
    
    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    RAISE NOTICE 'Updated % product-segment combinations with zone_structure_id', v_rows_updated;
    
    -- Show summary
    RAISE NOTICE 'Summary:';
    RAISE NOTICE '  - New product-segment pairs inserted: %', v_rows_inserted;
    RAISE NOTICE '  - Pairs updated with zone structure: %', v_rows_updated;
    
    -- Count how many pairs remain without zone structure
    RAISE NOTICE '  - Pairs still without zone structure: %', 
        (SELECT COUNT(*) 
         FROM base_pricing_restaurant.bp_product_customer_segment_prices pcs
         INNER JOIN base_pricing_restaurant.bp_product_master pm ON pcs.product_id = pm.product_id
         WHERE pcs.zone_structure_id IS NULL 
         AND pm.usable = TRUE);
END;
$procedure$
;
