--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:fn_validate_and_initialize_partition_11 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.fn_validate_and_initialize_partition_11

DROP FUNCTION IF EXISTS base_pricing.fn_validate_and_initialize_partition;

CREATE OR REPLACE FUNCTION base_pricing.fn_validate_and_initialize_partition(p_table_name text, p_partition_id integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_partition_name TEXT := p_table_name || '_' || p_partition_id;
    v_parent_oid oid;
    v_partition_oid oid;
    v_boundary_text text;
    v_extracted_value text;
BEGIN
    RAISE NOTICE 'Starting partition validation for table: %, partition ID: %', p_table_name, p_partition_id;

    -- 1. Get the parent table OID
    SELECT c.oid INTO v_parent_oid 
    FROM pg_class c 
    JOIN pg_namespace n ON c.relnamespace = n.oid 
    WHERE c.relname = p_table_name 
    AND n.nspname = 'base_pricing';
    
    IF v_parent_oid IS NULL THEN
        RAISE EXCEPTION 'Parent table base_pricing.% does not exist', p_table_name;
    END IF;

    -- 2. Check if partition exists (attached)
    SELECT c.oid, pg_get_expr(c.relpartbound, c.oid) INTO v_partition_oid, v_boundary_text
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    JOIN pg_inherits i ON c.oid = i.inhrelid
    WHERE n.nspname = 'base_pricing'
    AND c.relname = v_partition_name
    AND i.inhparent = v_parent_oid;

    -- 3. If exists, validate values
    IF v_partition_oid IS NOT NULL THEN
        SELECT (regexp_matches(v_boundary_text, 'IN\s*\([\s'']*(\d+)[\s'']*\)'))[1] 
        INTO v_extracted_value;
        
        IF v_extracted_value = p_partition_id::text THEN
            RAISE NOTICE 'Partition % already exists with correct values', v_partition_name;
            RETURN;
        END IF;
        
        RAISE EXCEPTION 'Partition % exists with different value. Expected: %, Found: %',
                       v_partition_name, p_partition_id, v_extracted_value;
    END IF;

    -- 4. Create and Attach (Split method to avoid ACCESS EXCLUSIVE lock on parent)
    -- We must ensure the table doesn't already exist as a standalone table
    BEGIN
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS base_pricing.%I (LIKE base_pricing.%I INCLUDING ALL)',
            v_partition_name, p_table_name
        );
    EXCEPTION WHEN OTHERS THEN
         -- If it already exists, that's fine, we proceed to try attaching
         RAISE NOTICE 'Table % might already exist, proceeding to attach', v_partition_name;
    END;

    BEGIN
        -- B. Attach the partition (Requires SHARE UPDATE EXCLUSIVE on parent, which allows concurrent SELECTs)
        EXECUTE format(
            'ALTER TABLE base_pricing.%I ATTACH PARTITION base_pricing.%I FOR VALUES IN (%L)',
            p_table_name, v_partition_name, p_partition_id
        );
        
        RAISE NOTICE 'Partition % attached successfully', v_partition_name;

    EXCEPTION WHEN OTHERS THEN
        -- Handle race conditions or specific attach errors
        IF SQLSTATE = '42P17' THEN  -- partition conflict/already exists
             RAISE NOTICE 'Partition % attach matched a concurrent creation or existing partition', v_partition_name;
        ELSE
            RAISE EXCEPTION 'Error attaching partition %: %', v_partition_name, SQLERRM;
        END IF;
    END;
END;
$function$
;
