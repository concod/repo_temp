--liquibase formatted sql
--changeset yashraj.jha@impactanalytics.co:sp_create_default_rules_5 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.sp_create_default_rules_5

DROP PROCEDURE IF EXISTS base_pricing_restaurant.sp_create_default_rules;

CREATE OR REPLACE PROCEDURE base_pricing_restaurant.sp_create_default_rules()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    v_product_levels TEXT[];
    v_store_levels TEXT[];
    v_product_select_cols TEXT := '';
    v_product_group_cols TEXT := '';
    v_store_select_cols TEXT := '';
    v_store_group_cols TEXT := '';
    v_max_product_level INT;
    v_max_store_level INT;
    v_rule_ids INT[] := ARRAY[1, 2, 3];
    v_rule_names TEXT[] := ARRAY['Line Rule', 'Price zone Rule', 'Pre-price Rule'];
BEGIN
    -- Delete existing mappings for these rules if they exist
    -- Delete from product mappings
    DELETE FROM base_pricing_restaurant.bp_rule_products_mapping 
    WHERE rule_id = ANY(v_rule_ids);
    
    -- Delete from store mappings
    DELETE FROM base_pricing_restaurant.bp_rule_stores_mapping 
    WHERE rule_id = ANY(v_rule_ids);
    
    -- Delete from segment mappings
    DELETE FROM base_pricing_restaurant.bp_rule_segments_mapping 
    WHERE rule_id = ANY(v_rule_ids);
    
    -- Delete from rule master
    DELETE FROM base_pricing_restaurant.bp_rule_master 
    WHERE id = ANY(v_rule_ids);
    
    RAISE NOTICE 'Deleted existing rules with IDs: %', v_rule_ids;

    -- Get product hierarchy levels
    SELECT array_agg('l'||product_hierarchy_level_id||'_cid'), MAX(product_hierarchy_level_id)
    INTO v_product_levels, v_max_product_level
    FROM base_pricing_restaurant.bp_product_hierarchy_level;

    -- Get store hierarchy levels
    SELECT array_agg('s'||store_hierarchy_level_id||'_cid'), MAX(store_hierarchy_level_id)
    INTO v_store_levels, v_max_store_level
    FROM base_pricing_restaurant.bp_store_hierarchy_level;

    -- Build dynamic column lists for product mappings
    FOR i IN 0..v_max_product_level LOOP
        v_product_select_cols := v_product_select_cols || ', pm.l'||i||'_cid';
        v_product_group_cols := v_product_group_cols || ', l'||i||'_cid';
    END LOOP;

    -- Build dynamic column lists for store mappings
    FOR i IN 0..v_max_store_level LOOP
        v_store_select_cols := v_store_select_cols || ', sm.s'||i||'_cid';
        v_store_group_cols := v_store_group_cols || ', s'||i||'_cid';
    END LOOP;

    -- Remove leading commas
    v_product_select_cols := substring(v_product_select_cols FROM 2);
    v_product_group_cols := substring(v_product_group_cols FROM 2);
    v_store_select_cols := substring(v_store_select_cols FROM 2);
    v_store_group_cols := substring(v_store_group_cols FROM 2);

    -- Insert default rules with specific IDs
    INSERT INTO base_pricing_restaurant.bp_rule_master
    (
        id,
        "name",
        description,
        rule_type_id,
        rule_scope_id,
        parent_rule_id,
        product_grouping_type,
        store_grouping_type,
        is_active,
        created_by,
        created_at,
        updated_by,
        updated_at,
        product_hierarchy_level,
        store_hierarchy_level
    )
    VALUES
    (
        1,
        'Line Rule',
        'Enforces the same price for similar products or different variations of the same product.',
        1001,
        0,
        NULL,
        0,
        0,
        true,
        12,
        now(),
        12,
        now(),
        'All',
        'All'
    ),
    (
        2,
        'Price zone Rule',
        'Enforces the same price across a selection of stores.',
        1002,
        0,
        NULL,
        0,
        0,
        true,
        12,
        now(),
        12,
        now(),
        'All',
        'All'
    ),
    (
        3,
        'Pre-price Rule',
        'Ensures prices of selected products do not change.',
        1003,
        0,
        NULL,
        0,
        0,
        true,
        12,
        now(),
        12,
        now(),
        'All',
        'All'
    );

    -- Initialize partitions for products, stores, segments for all rules
    PERFORM base_pricing_restaurant.fn_validate_and_initialize_partition('bp_rule_products_mapping', 1);
    PERFORM base_pricing_restaurant.fn_validate_and_initialize_partition('bp_rule_stores_mapping', 1);
    PERFORM base_pricing_restaurant.fn_validate_and_initialize_partition('bp_rule_segments_mapping', 1);

    PERFORM base_pricing_restaurant.fn_validate_and_initialize_partition('bp_rule_products_mapping', 2);
    PERFORM base_pricing_restaurant.fn_validate_and_initialize_partition('bp_rule_stores_mapping', 2);
    PERFORM base_pricing_restaurant.fn_validate_and_initialize_partition('bp_rule_segments_mapping', 2);

    PERFORM base_pricing_restaurant.fn_validate_and_initialize_partition('bp_rule_products_mapping', 3);
    PERFORM base_pricing_restaurant.fn_validate_and_initialize_partition('bp_rule_stores_mapping', 3);
    PERFORM base_pricing_restaurant.fn_validate_and_initialize_partition('bp_rule_segments_mapping', 3);

    -- Dynamic product mappings
    EXECUTE format('
    INSERT INTO base_pricing_restaurant.bp_rule_products_mapping (
        rule_id,
        product_id,
        %s
    )
    SELECT
        unnest(ARRAY[1, 2, 3]) as new_rule_id,
        pm.product_id::integer,
        %s
    FROM base_pricing_restaurant.bp_product_master pm
    WHERE pm.active = true AND pm.usable = true
    ON CONFLICT (rule_id, product_id) DO NOTHING', 
    v_product_group_cols, v_product_select_cols);

    -- Dynamic store mappings
    EXECUTE format('
    INSERT INTO base_pricing_restaurant.bp_rule_stores_mapping (
        rule_id,
        store_id,
        %s
    )
    SELECT
        unnest(ARRAY[1, 2, 3]) as new_rule_id,
        sm.store_id::integer,
        %s
    FROM base_pricing_restaurant.bp_store_master sm
    WHERE sm.active = true
    ON CONFLICT (rule_id, store_id) DO NOTHING', 
    v_store_group_cols, v_store_select_cols);

    -- Segment mappings (static as hierarchy levels don't apply)
    INSERT INTO base_pricing_restaurant.bp_rule_segments_mapping (
        rule_id,
        segment_id
    )
    SELECT
        unnest(ARRAY[1,2,3]) AS new_rule_id,
        csm.segment_id
    FROM
        base_pricing_restaurant.bp_customer_segment_master csm
    WHERE
        csm.is_active = true
    ON CONFLICT (rule_id, segment_id) DO NOTHING;
    
    RAISE NOTICE 'Default rules and mappings created successfully with IDs: 1, 2, 3';

END;
$procedure$
;
