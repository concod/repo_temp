--liquibase formatted sql
--changeset subhasis.jena@impactanalytics.co:fn_create_table_from_metadata stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.fn_create_table_from_metadata

DROP FUNCTION IF EXISTS base_pricing_restaurant.fn_create_table_from_metadata;

CREATE OR REPLACE FUNCTION base_pricing_restaurant.fn_create_table_from_metadata(p_schema text, p_table_name text, p_column_definitions text, p_primary_keys text, p_metadata_table_name text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    attr RECORD;
    ddl TEXT;
BEGIN
    -- Step 1: Drop the table if it exists
    EXECUTE format('DROP TABLE IF EXISTS %I.%I', p_schema, p_table_name);

    -- Step 2: Initialize the DDL with the initial column definitions
    ddl := format('CREATE TABLE %I.%I (', p_schema, p_table_name) || p_column_definitions || ', ';

    -- Debugging output to check the initial DDL
    RAISE NOTICE 'Initial DDL: %', ddl;

    -- Step 3: Fetch active attributes from the specified metadata table
    FOR attr IN
        EXECUTE format('SELECT tb_column_reference, data_type FROM %I.%I WHERE is_active = TRUE', p_schema, p_metadata_table_name)
    LOOP
        -- Step 4: Append each active attribute to the DDL with proper formatting
        IF attr.data_type = 'boolean' THEN
            ddl := ddl || format('%I BOOLEAN NULL, ', attr.tb_column_reference);
        ELSIF attr.data_type = 'text' THEN
            ddl := ddl || format('%I TEXT NULL, ', attr.tb_column_reference);
        ELSIF attr.data_type = 'number' THEN
            ddl := ddl || format('%I NUMERIC NULL, ', attr.tb_column_reference);
        ELSIF attr.data_type = 'float' THEN
            ddl := ddl || format('%I FLOAT8 NULL, ', attr.tb_column_reference);
        ELSE
            RAISE WARNING 'Unrecognized data type: %', attr.data_type;
        END IF;
    END LOOP;

    -- Step 5: Remove trailing comma and space, add updated_at, and primary key
    IF length(ddl) > 2 THEN
        ddl := left(ddl, length(ddl) - 2);  -- Remove last comma and space
    END IF;
    ddl := ddl || ', updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (' || p_primary_keys || '));';

    -- Debugging output to check the final SQL
    RAISE NOTICE 'Final SQL: %', ddl;

    -- Step 6: Execute the CREATE TABLE statement
    EXECUTE ddl;

    -- Step 7: Return the DDL for reference
    RETURN ddl;
END;
$function$
;