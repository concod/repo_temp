--liquibase formatted sql
--changeset subhasis.jena@impactanalytics.co:fn_bp_insert_rule_product_store_mapping_3 stripComments:false splitStatements:false runOnChange:true context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.fn_bp_insert_rule_product_store_mapping

DROP FUNCTION IF EXISTS base_pricing_restaurant.fn_bp_insert_rule_product_store_mapping;


CREATE OR REPLACE FUNCTION base_pricing_restaurant.fn_bp_insert_rule_product_store_mapping(rule_name text, rule_description text, rule_type_id integer, rule_scope_id integer, parent_rule_id integer, created_by integer, created_at timestamp without time zone, updated_by integer, updated_at timestamp without time zone, product_hierarchy_levels_str text, store_hierarchy_levels_str text, product_grouping_type integer DEFAULT 0, store_grouping_type integer DEFAULT 0, product_where_cond text DEFAULT NULL::text, store_where_cond text DEFAULT NULL::text, segment_where_cond text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    new_rule_id INT;
    partition_name TEXT;
    v_exists BOOLEAN;
BEGIN
    -- Insert into bp_rule_master and get the new rule_id
    INSERT INTO base_pricing_restaurant.bp_rule_master (
        "name",
        description,
        rule_type_id,
        rule_scope_id,
        parent_rule_id,
        created_by,
        created_at,
        updated_by,
        updated_at,
        product_grouping_type,
        store_grouping_type
    )
    VALUES (
        rule_name,
        rule_description,
        rule_type_id,
        rule_scope_id,
        parent_rule_id,
        created_by,
        created_at,
        updated_by,
        updated_at,
        product_grouping_type,
        store_grouping_type
    )
    RETURNING id INTO new_rule_id;

    -- Ensure a partition exists for the new rule_id
    partition_name := format('base_pricing_restaurant.bp_rule_products_mapping_%s', new_rule_id);

    SELECT EXISTS (
        SELECT 1
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = partition_name
          AND n.nspname = 'base_pricing_restaurant'
    ) INTO v_exists;

    IF NOT v_exists THEN
        EXECUTE format(
            'CREATE TABLE base_pricing_restaurant.%I PARTITION OF base_pricing_restaurant.bp_rule_products_mapping
             FOR VALUES IN (%s)',
            partition_name, new_rule_id
        );
    END IF;

    BEGIN
        -- Try to create a partition dynamically
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS %I PARTITION OF base_pricing_restaurant.bp_rule_products_mapping
            FOR VALUES IN (%s);',
            partition_name, new_rule_id
        );
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Partition % already exists or could not be created.', partition_name;
    END;

    -- Execute the INSERT INTO SELECT dynamically for products
    IF product_where_cond IS NOT NULL THEN
        EXECUTE format(
            'INSERT INTO base_pricing_restaurant.bp_rule_products_mapping (
                rule_id, product_id, %s
            )
            SELECT %s, product_id, %s
            FROM base_pricing_restaurant.bp_product_master
            WHERE %s and active=true and usable = true',
            product_hierarchy_levels_str,new_rule_id,product_hierarchy_levels_str, product_where_cond
        );
    END IF;

    -- Ensure a partition exists for the store mapping table if needed
    partition_name := format('base_pricing_restaurant.bp_rule_stores_mapping_%s', new_rule_id);
    SELECT EXISTS (
        SELECT 1
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = partition_name
          AND n.nspname = 'base_pricing_restaurant'
    ) INTO v_exists;

    IF NOT v_exists THEN
        EXECUTE format(
            'CREATE TABLE base_pricing_restaurant.%I PARTITION OF base_pricing_restaurant.bp_rule_stores_mapping
             FOR VALUES IN (%s)',
            partition_name, new_rule_id
        );
    END IF;
    BEGIN
        -- Try to create a partition dynamically for stores
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS %I PARTITION OF base_pricing_restaurant.bp_rule_stores_mapping
            FOR VALUES IN (%s);',
            partition_name, new_rule_id
        );
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Partition % already exists or could not be created.', partition_name;
    END;

    -- Execute the INSERT INTO SELECT dynamically for stores
    IF store_where_cond IS NOT NULL THEN
        EXECUTE format(
            'INSERT INTO base_pricing_restaurant.bp_rule_stores_mapping (
                rule_id, store_id, %s
            )
            SELECT %s, store_id, %s
            FROM base_pricing_restaurant.bp_store_master
            WHERE %s and active=true;',
            store_hierarchy_levels_str ,new_rule_id, store_hierarchy_levels_str,store_where_cond
        );
    END IF;

    partition_name := format('base_pricing_restaurant.bp_rule_segments_mapping_%s', new_rule_id);

    SELECT EXISTS (
        SELECT 1
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = partition_name
          AND n.nspname = 'base_pricing_restaurant'
    ) INTO v_exists;

    IF NOT v_exists THEN
        EXECUTE format(
            'CREATE TABLE base_pricing_restaurant.%I PARTITION OF base_pricing_restaurant.bp_rule_segments_mapping
             FOR VALUES IN (%s)',
            partition_name, new_rule_id
        );
    END IF;

    BEGIN
        -- Try to create a partition dynamically for stores
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS %I PARTITION OF base_pricing_restaurant.bp_rule_segments_mapping
            FOR VALUES IN (%s);',
            partition_name, new_rule_id
        );
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Partition % already exists or could not be created.', partition_name;
    END;

    -- Execute the INSERT INTO SELECT dynamically for stores
    IF segment_where_cond IS NOT NULL THEN
        EXECUTE format(
            'INSERT INTO base_pricing_restaurant.bp_rule_segments_mapping (
                rule_id, segment_id
            )
            SELECT %s, segment_id
            FROM base_pricing_restaurant.bp_customer_segment_master
            WHERE %s;',
            new_rule_id, segment_where_cond
        );
    END IF;
    -- Return the new rule_id
    RETURN new_rule_id;
END;
$function$
;
