--liquibase formatted sql
--changeset subhasis.jena@impactanalytics.co:fn_create_boolean_subpartitions stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.fn_create_boolean_subpartitions

DROP FUNCTION IF EXISTS base_pricing_restaurant.fn_create_boolean_subpartitions;

CREATE OR REPLACE FUNCTION base_pricing_restaurant.fn_create_boolean_subpartitions(p_partition_name text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_subpartition_true_name TEXT := p_partition_name || '_true';
    v_subpartition_false_name TEXT := p_partition_name || '_false';
    v_subpartition_true_oid oid;
    v_subpartition_false_oid oid;
    v_parent_oid oid;
    v_parent_exists boolean;
BEGIN
    RAISE NOTICE '🔧 START: Creating boolean subpartitions for partition: %', p_partition_name;
    RAISE NOTICE '🔧 Subpartition names: true=%, false=%', v_subpartition_true_name, v_subpartition_false_name;

    -- Check if parent partition exists
    SELECT EXISTS (
        SELECT 1 FROM pg_class c 
        JOIN pg_namespace n ON c.relnamespace = n.oid 
        WHERE c.relname = p_partition_name 
        AND n.nspname = 'base_pricing_restaurant'
    ) INTO v_parent_exists;
    
    IF NOT v_parent_exists THEN
        RAISE EXCEPTION '❌ Parent partition base_pricing_restaurant.% does not exist', p_partition_name;
    END IF;

    -- Get the parent partition OID
    SELECT c.oid INTO v_parent_oid 
    FROM pg_class c 
    JOIN pg_namespace n ON c.relnamespace = n.oid 
    WHERE c.relname = p_partition_name 
    AND n.nspname = 'base_pricing_restaurant';
    
    RAISE NOTICE '🔧 Parent OID found: %', v_parent_oid;

    -- Check if true subpartition already exists
    SELECT c.oid INTO v_subpartition_true_oid
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    JOIN pg_inherits i ON c.oid = i.inhrelid
    WHERE n.nspname = 'base_pricing_restaurant'
    AND c.relname = v_subpartition_true_name
    AND i.inhparent = v_parent_oid;

    RAISE NOTICE '🔧 True subpartition exists: %', (v_subpartition_true_oid IS NOT NULL);

    -- Create true subpartition if it doesn't exist
    IF v_subpartition_true_oid IS NULL THEN
        BEGIN
            RAISE NOTICE '🔧 Creating true subpartition: %', v_subpartition_true_name;
            EXECUTE format(
                'CREATE TABLE IF NOT EXISTS base_pricing_restaurant.%I PARTITION OF base_pricing_restaurant.%I FOR VALUES IN (true)',
                v_subpartition_true_name, p_partition_name
            );
            RAISE NOTICE '✅ True subpartition % created successfully', v_subpartition_true_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '❌ Error creating true subpartition %: %', 
                         v_subpartition_true_name, SQLERRM;
            RAISE; -- Re-raise the exception
        END;
    ELSE
        RAISE NOTICE '✅ True subpartition % already exists', v_subpartition_true_name;
    END IF;

    -- Check if false subpartition already exists
    SELECT c.oid INTO v_subpartition_false_oid
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    JOIN pg_inherits i ON c.oid = i.inhrelid
    WHERE n.nspname = 'base_pricing_restaurant'
    AND c.relname = v_subpartition_false_name
    AND i.inhparent = v_parent_oid;

    RAISE NOTICE '🔧 False subpartition exists: %', (v_subpartition_false_oid IS NOT NULL);

    -- Create false subpartition if it doesn't exist
    IF v_subpartition_false_oid IS NULL THEN
        BEGIN
            RAISE NOTICE '🔧 Creating false subpartition: %', v_subpartition_false_name;
            EXECUTE format(
                'CREATE TABLE IF NOT EXISTS base_pricing_restaurant.%I PARTITION OF base_pricing_restaurant.%I FOR VALUES IN (false)',
                v_subpartition_false_name, p_partition_name
            );
            RAISE NOTICE '✅ False subpartition % created successfully', v_subpartition_false_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '❌ Error creating false subpartition %: %', 
                         v_subpartition_false_name, SQLERRM;
            RAISE; -- Re-raise the exception
        END;
    ELSE
        RAISE NOTICE '✅ False subpartition % already exists', v_subpartition_false_name;
    END IF;

    RAISE NOTICE '✅ COMPLETED: Boolean subpartitions created for %', p_partition_name;
END;
$function$
;