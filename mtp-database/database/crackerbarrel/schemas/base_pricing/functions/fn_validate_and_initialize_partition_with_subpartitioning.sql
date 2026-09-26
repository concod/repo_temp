--liquibase formatted sql
--changeset subhasis.jena@impactanalytics.co:fn_validate_and_initialize_partition_with_subpartitioning stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.fn_validate_and_initialize_partition_with_subpartitioning

DROP FUNCTION IF EXISTS base_pricing.fn_validate_and_initialize_partition_with_subpartitioning;

CREATE OR REPLACE FUNCTION base_pricing.fn_validate_and_initialize_partition_with_subpartitioning(p_table_name text, p_partition_id integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_partition_name TEXT := p_table_name || '_' || p_partition_id;
    v_parent_oid oid;
    v_partition_oid oid;
    v_boundary_text text;
    v_needs_subpartitioning boolean := false;
BEGIN
    RAISE NOTICE '🚀 START: Partition validation for table: %, partition ID: %', p_table_name, p_partition_id;
    RAISE NOTICE '🚀 Partition name: %', v_partition_name;

    -- Determine if this table needs subpartitioning
    IF p_table_name = 'bp_unlogged_combinations' THEN
        v_needs_subpartitioning := true;
        RAISE NOTICE '🚀 Table % identified as needing boolean subpartitioning', p_table_name;
    END IF;

    -- Get the parent table OID with schema verification
    SELECT c.oid INTO v_parent_oid 
    FROM pg_class c 
    JOIN pg_namespace n ON c.relnamespace = n.oid 
    WHERE c.relname = p_table_name 
    AND n.nspname = 'base_pricing';
    
    IF v_parent_oid IS NULL THEN
        RAISE EXCEPTION '❌ Parent table base_pricing.% does not exist', p_table_name;
    END IF;

    RAISE NOTICE '🚀 Parent OID: %', v_parent_oid;

    -- Check if partition exists by attempting to get its OID and boundary
    SELECT c.oid, pg_get_expr(c.relpartbound, c.oid) INTO v_partition_oid, v_boundary_text
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    JOIN pg_inherits i ON c.oid = i.inhrelid
    WHERE n.nspname = 'base_pricing'
    AND c.relname = v_partition_name
    AND i.inhparent = v_parent_oid;

    RAISE NOTICE '🚀 Partition exists: %', (v_partition_oid IS NOT NULL);

    -- If partition exists with correct boundary, handle subpartitions and return success
    IF v_partition_oid IS NOT NULL THEN
        -- Extract the numeric value regardless of quoting or whitespace
        DECLARE
            v_extracted_value text;
        BEGIN
            SELECT (regexp_matches(v_boundary_text, 'IN\s*\([\s'']*(\d+)[\s'']*\)'))[1] 
            INTO v_extracted_value;
            
            IF v_extracted_value = p_partition_id::text THEN
                RAISE NOTICE '✅ Partition % already exists with correct values', v_partition_name;
                
                -- If this table needs subpartitioning, create them
                IF v_needs_subpartitioning THEN
                    RAISE NOTICE '🚀 Creating subpartitions for existing partition %', v_partition_name;
                    PERFORM base_pricing.fn_create_boolean_subpartitions(v_partition_name);
                END IF;
                
                RETURN;
            END IF;
            
            RAISE EXCEPTION '❌ Partition % exists with different value. Expected: %, Found: %',
                           v_partition_name, p_partition_id, v_extracted_value;
        END;
    END IF;

    -- Partition doesn't exist - attempt to create it with proper error handling
    BEGIN
        IF v_needs_subpartitioning THEN
            RAISE NOTICE '🚀 Creating partition WITH subpartitioning: %', v_partition_name;
            -- Create partition WITH subpartitioning
            EXECUTE format(
                'CREATE TABLE IF NOT EXISTS base_pricing.%I PARTITION OF base_pricing.%I FOR VALUES IN (%L) PARTITION BY LIST (is_kvi)',
                v_partition_name, p_table_name, p_partition_id
            );
            RAISE NOTICE '✅ Partition % created successfully WITH subpartitioning', v_partition_name;
            
            -- Create the boolean subpartitions
            RAISE NOTICE '🚀 Creating boolean subpartitions for %', v_partition_name;
            PERFORM base_pricing.fn_create_boolean_subpartitions(v_partition_name);
        ELSE
            RAISE NOTICE '🚀 Creating partition WITHOUT subpartitioning: %', v_partition_name;
            -- Create partition WITHOUT subpartitioning (original behavior)
            EXECUTE format(
                'CREATE TABLE IF NOT EXISTS base_pricing.%I PARTITION OF base_pricing.%I FOR VALUES IN (%L)',
                v_partition_name, p_table_name, p_partition_id
            );
            RAISE NOTICE '✅ Partition % created successfully WITHOUT subpartitioning', v_partition_name;
        END IF;
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ Error in partition creation: %', SQLERRM;
        -- If we get an overlap error, it means the partition exists in a way we couldn't detect
        IF SQLSTATE = '42P17' THEN  -- partition conflict error code
            RAISE NOTICE '⚠️ Partition % exists in a way that couldn''t be detected (likely a concurrent creation)', 
                         v_partition_name;
            -- Still attempt to create subpartitions if needed
            IF v_needs_subpartitioning THEN
                PERFORM base_pricing.fn_create_boolean_subpartitions(v_partition_name);
            END IF;
        ELSE
            RAISE EXCEPTION '❌ Error creating partition %: %', v_partition_name, SQLERRM;
        END IF;
    END;
    
    RAISE NOTICE '✅ COMPLETED: Partition processing finished for %', v_partition_name;
END;
$function$
;