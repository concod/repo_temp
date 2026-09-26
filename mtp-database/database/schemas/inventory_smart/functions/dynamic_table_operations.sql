--liquibase formatted sql
--changeset liquibase:dynamic_table_operations runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for dynamic_table_operations
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.dynamic_table_operations(TEXT, TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION inventory_smart.dynamic_table_operations(
    operation_type TEXT,  -- 'drop', 'create', 'both'
    table_name TEXT,
    target_table TEXT DEFAULT NULL,
    schema_name TEXT DEFAULT 'public'
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    sql TEXT;
    result TEXT;
BEGIN
    -- Validate inputs
    IF table_name IS NULL OR table_name = '' THEN
        RETURN 'ERROR: Table name cannot be empty';
    END IF;
    
    IF schema_name IS NULL OR schema_name = '' THEN
        schema_name := 'public';
    END IF;
    
    -- Build full table name with schema
    table_name := schema_name || '.' || table_name;
    
    -- Handle operations based on type
    CASE operation_type
        WHEN 'drop' THEN
            sql := 'DROP TABLE IF EXISTS ' || table_name || ' CASCADE';
            EXECUTE sql;
            result := 'SUCCESS: Table dropped - ' || table_name;
            
        WHEN 'create' THEN
            IF target_table IS NULL OR target_table = '' THEN
                RETURN 'ERROR: Target table required for create operation';
            END IF;
            target_table := schema_name || '.' || target_table;
            sql := 'CREATE UNLOGGED TABLE ' || table_name || 
                   ' (LIKE ' || target_table || ' INCLUDING ALL)';
            EXECUTE sql;
            result := 'SUCCESS: Table created - ' || table_name;
            
        WHEN 'both' THEN
            -- Drop first
            sql := 'DROP TABLE IF EXISTS ' || table_name || ' CASCADE';
            EXECUTE sql;
            
            -- Then create
            IF target_table IS NULL OR target_table = '' THEN
                RETURN 'ERROR: Target table required for create operation';
            END IF;
            target_table := schema_name || '.' || target_table;
            sql := 'CREATE UNLOGGED TABLE ' || table_name || 
                   ' (LIKE ' || target_table || ' INCLUDING ALL)';
            EXECUTE sql;
            result := 'SUCCESS: Table dropped and created - ' || table_name;
            
        ELSE
            RETURN 'ERROR: Invalid operation type. Use: drop, create, or both';
    END CASE;
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'ERROR: ' || SQLERRM;
END;
$function$
;
