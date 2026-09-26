--liquibase formatted sql
--changeset krithika.s@impactanalytics.co:fn_validate_and_initialize_partition_new_v1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial_function_create for fn_validate_and_initialize_partition_new_v1


DROP FUNCTION IF EXISTS base_pricing.fn_validate_and_initialize_partition(text, int4);

-- DROP FUNCTION base_pricing.fn_validate_and_initialize_partition(text, int4);

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
BEGIN
    RAISE NOTICE 'Starting partition validation for table: %, partition ID: %', p_table_name, p_partition_id;

    -- Get the parent table OID with schema verification
    SELECT c.oid INTO v_parent_oid 
    FROM pg_class c 
    JOIN pg_namespace n ON c.relnamespace = n.oid 
    WHERE c.relname = p_table_name 
    AND n.nspname = 'base_pricing';
    
    IF v_parent_oid IS NULL THEN
        RAISE EXCEPTION 'Parent table base_pricing.% does not exist', p_table_name;
    END IF;

    -- Check if partition exists by attempting to get its OID and boundary
    SELECT c.oid, pg_get_expr(c.relpartbound, c.oid) INTO v_partition_oid, v_boundary_text
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    JOIN pg_inherits i ON c.oid = i.inhrelid
    WHERE n.nspname = 'base_pricing'
    AND c.relname = v_partition_name
    AND i.inhparent = v_parent_oid;

    -- If partition exists with correct boundary, return success
    IF v_partition_oid IS NOT NULL THEN
	    -- Extract the numeric value regardless of quoting or whitespace
	    DECLARE
	        v_extracted_value text;
	    BEGIN
	        SELECT (regexp_matches(v_boundary_text, 'IN\s*\([\s'']*(\d+)[\s'']*\)'))[1] 
	        INTO v_extracted_value;
	        
	        IF v_extracted_value = p_partition_id::text THEN
	            RAISE NOTICE 'Partition % already exists with correct values', v_partition_name;
	            RETURN;
	        END IF;
	        
	        RAISE EXCEPTION 'Partition % exists with different value. Expected: %, Found: %',
	                       v_partition_name, p_partition_id, v_extracted_value;
	    END;
	END IF;

    -- Partition doesn't exist - attempt to create it with proper error handling
    BEGIN
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS base_pricing.%I PARTITION OF base_pricing.%I FOR VALUES IN (%L)',
            v_partition_name, p_table_name, p_partition_id
        );
        RAISE NOTICE 'Partition % created successfully', v_partition_name;
    EXCEPTION WHEN OTHERS THEN
        -- If we get an overlap error, it means the partition exists in a way we couldn't detect
        IF SQLSTATE = '42P17' THEN  -- partition conflict error code
            RAISE NOTICE 'Partition % exists in a way that couldn''t be detected (likely a concurrent creation)', 
                         v_partition_name;
        ELSE
            RAISE EXCEPTION 'Error creating partition %: %', v_partition_name, SQLERRM;
        END IF;
    END;
END;
$function$
;