--liquibase formatted sql
--changeset subhasis.jena@impactanalytics.co:fn_safe_drop_table stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.fn_safe_drop_table

DROP FUNCTION IF EXISTS base_pricing_restaurant.fn_safe_drop_table;

CREATE OR REPLACE FUNCTION base_pricing_restaurant.fn_safe_drop_table(p_schema_name text, p_table_name text, p_confirmation_text text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_expected_confirmation TEXT;
BEGIN
    -- Validate inputs
    IF p_schema_name IS NULL OR p_table_name IS NULL THEN
        RETURN 'Error: Schema name and table name cannot be NULL';
    END IF;
    
    -- Check if table exists
    IF NOT EXISTS(
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = p_schema_name 
        AND table_name = p_table_name
    ) THEN
        RETURN format('Table %I.%I does not exist', p_schema_name, p_table_name);
    END IF;
    
    -- Require confirmation for safety
    v_expected_confirmation := format('Yes, drop %I.%I', p_schema_name, p_table_name);
    
    IF p_confirmation_text != v_expected_confirmation THEN
        RETURN format(
            'Safety check failed. To drop table %I.%I, call the function with: %s',
            p_schema_name,
            p_table_name,
            format('SELECT safe_drop_table(%L, %L, %L)', p_schema_name, p_table_name, v_expected_confirmation)
        );
    END IF;
    
    -- Drop the table
    EXECUTE format('DROP TABLE %I.%I', p_schema_name, p_table_name);
    
    RETURN format('Table %I.%I dropped successfully', p_schema_name, p_table_name);
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN format('Error dropping table %I.%I: %s', p_schema_name, p_table_name, SQLERRM);
END;
$function$
;