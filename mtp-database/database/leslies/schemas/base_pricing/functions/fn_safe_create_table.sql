--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:fn_safe_create_table_10 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.fn_safe_create_table_10

DROP FUNCTION IF EXISTS base_pricing.fn_safe_create_table;

CREATE OR REPLACE FUNCTION base_pricing.fn_safe_create_table(p_schema_name text, p_table_name text, p_ddl_query text, p_confirmation_text text DEFAULT NULL::text, p_drop_if_exists boolean DEFAULT false)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_expected_confirmation TEXT;
    v_table_exists BOOLEAN;
    v_full_table_name TEXT;
    v_validated_ddl TEXT;
BEGIN
    -- Validate inputs
    IF p_schema_name IS NULL OR p_table_name IS NULL OR p_ddl_query IS NULL THEN
        RETURN 'Error: Schema name, table name, and DDL query cannot be NULL';
    END IF;
    
    -- Check if schema exists, create if not
    IF NOT EXISTS(SELECT 1 FROM information_schema.schemata WHERE schema_name = p_schema_name) THEN
        EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', p_schema_name);
    END IF;
    
    -- Check if table already exists
    v_table_exists := EXISTS(
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = p_schema_name 
        AND table_name = p_table_name
    );
    
    v_full_table_name := format('%I.%I', p_schema_name, p_table_name);
    
    -- If table exists and we're not dropping it, return error
    IF v_table_exists AND NOT p_drop_if_exists THEN
        RETURN format('Table %s already exists. Use p_drop_if_exists = true to replace it.', v_full_table_name);
    END IF;
    
    -- Require confirmation for safety (especially if dropping existing table)
    IF p_drop_if_exists AND v_table_exists THEN
        v_expected_confirmation := format('Yes, create or replace %s', v_full_table_name);
    ELSE
        v_expected_confirmation := format('Yes, create %s', v_full_table_name);
    END IF;
    
    IF p_confirmation_text != v_expected_confirmation THEN
        RETURN format(
            'Safety check failed. To create table %s, call the function with: %s',
            v_full_table_name,
            format('SELECT safe_create_table(%L, %L, %L, %L, %s)', 
                   p_schema_name, p_table_name, p_ddl_query, v_expected_confirmation, 
                   COALESCE(p_drop_if_exists::text, 'false'))
        );
    END IF;
    
    -- Validate that DDL query is a CREATE TABLE statement
    IF NOT upper(trim(p_ddl_query)) LIKE 'CREATE%TABLE%' THEN
        RETURN 'Error: DDL query must be a CREATE TABLE statement';
    END IF;
    
    -- Drop existing table if requested and exists
    IF p_drop_if_exists AND v_table_exists THEN
        EXECUTE format('DROP TABLE IF EXISTS %I.%I', p_schema_name, p_table_name);
    END IF;
    
    -- Execute the DDL query
    EXECUTE p_ddl_query;
    
    -- Verify table was created
    IF EXISTS(
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = p_schema_name 
        AND table_name = p_table_name
    ) THEN
        RETURN format('Table %s created successfully', v_full_table_name);
    ELSE
        RETURN format('Warning: DDL executed but table %s was not created', v_full_table_name);
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN format('Error creating table %s: %s', v_full_table_name, SQLERRM);
END;
$function$
;