--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:fn_get_attribute_metadata_11 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.fn_get_attribute_metadata_11

DROP FUNCTION IF EXISTS base_pricing.fn_get_attribute_metadata;

CREATE OR REPLACE FUNCTION base_pricing.fn_get_attribute_metadata(table_names text[] DEFAULT ARRAY[]::text[], input_schema_name text DEFAULT 'base_pricing'::text, execute_query boolean DEFAULT true)
 RETURNS TABLE(generated_query text, execution_summary text, records jsonb, error_message text, execution_time_ms integer)
 LANGUAGE plpgsql
AS $function$
DECLARE
    dynamic_query text;
    column_list text;
    first_table text;
    start_time timestamp;
    end_time timestamp;
    error_context text;
    table_count integer;
    json_results jsonb[];
    result_json jsonb;
BEGIN
    -- Initialize timing
    start_time := clock_timestamp();
    generated_query := NULL;
    execution_summary := NULL;
    records := NULL;
    error_message := NULL;
    execution_time_ms := 0;
    json_results := '{}';

    -- Log function call
    RAISE NOTICE 'Function get_attribute_metadata called with: table_names=%, schema_name=%, execute_query=%', 
                 table_names, input_schema_name, execute_query;

    BEGIN
        -- Validate input parameters
        IF table_names IS NULL OR array_length(table_names, 1) = 0 THEN
            RAISE EXCEPTION 'Table names array cannot be empty. Please provide at least one table name.';
        END IF;

        IF input_schema_name IS NULL OR trim(input_schema_name) = '' THEN
            RAISE EXCEPTION 'Schema name cannot be empty.';
        END IF;

        -- Validate that schema exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = input_schema_name) THEN
            RAISE EXCEPTION 'Schema "%" does not exist.', input_schema_name;
        END IF;

        table_count := array_length(table_names, 1);
        first_table := table_names[1];

        -- Log table processing
        RAISE NOTICE 'Processing % tables. First table: %', table_count, first_table;

        -- Validate that first table exists
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = input_schema_name AND table_name = first_table
        ) THEN
            RAISE EXCEPTION 'Table "%"."%" does not exist.', input_schema_name, first_table;
        END IF;

        -- Get all columns dynamically with proper ordering
        SELECT string_agg(column_name, ', ' ORDER BY ordinal_position)
        INTO column_list
        FROM information_schema.columns
        WHERE table_schema = input_schema_name 
          AND table_name = first_table;

        -- Check if we got any columns
        IF column_list IS NULL OR trim(column_list) = '' THEN
            RAISE EXCEPTION 'No columns found for table "%"."%"', input_schema_name, first_table;
        END IF;

        RAISE NOTICE 'Found % columns for table %', 
                     (SELECT COUNT(*) FROM information_schema.columns 
                      WHERE table_schema = input_schema_name AND table_name = first_table),
                     first_table;

        -- Build dynamic query
        dynamic_query := format(
            'SELECT %s, %L as source_table FROM %I.%I where is_active =  true',
            column_list, first_table, input_schema_name, first_table
        );

        -- Validate and add remaining tables
        FOR i IN 2..table_count LOOP
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_schema = input_schema_name AND table_name = table_names[i]
            ) THEN
                RAISE EXCEPTION 'Table "%"."%" does not exist.', input_schema_name, table_names[i];
            END IF;

            dynamic_query := dynamic_query || format(
                ' UNION ALL SELECT %s, %L as source_table FROM %I.%I',
                column_list, table_names[i], input_schema_name, table_names[i]
            );

            RAISE NOTICE 'Added table % to UNION', table_names[i];
        END LOOP;

        -- Store the generated query
        generated_query := dynamic_query;
        RAISE NOTICE 'Generated dynamic query successfully';

        -- Execute if requested
        IF execute_query THEN
            RAISE NOTICE 'Executing query and returning JSON data...';
            
            -- Execute query and collect results as JSON
            BEGIN
                -- Convert the result to JSON array
                EXECUTE 'SELECT jsonb_agg(row_to_json(t)) FROM (' || dynamic_query || ') t' 
                INTO records;
                
                -- If no results, return empty array instead of NULL
                IF records IS NULL THEN
                    records := '[]'::jsonb;
                END IF;
                
                execution_summary := format('Query executed successfully. Processed %s tables. Returned %s rows.', 
                                           table_count, jsonb_array_length(records));
                
                RAISE NOTICE 'Query executed successfully. Returned % rows as JSON.', jsonb_array_length(records);
            EXCEPTION
                WHEN others THEN
                    GET STACKED DIAGNOSTICS error_context = PG_EXCEPTION_CONTEXT;
                    error_message := format(
                        'Execution ERROR: %s (SQLSTATE: %s). Context: %s',
                        SQLERRM, SQLSTATE, error_context
                    );
                    execution_summary := 'Query generation succeeded but execution failed';
                    records := NULL;
                    RAISE WARNING 'Query execution failed: %', error_message;
            END;
        ELSE
            execution_summary := format('Query generated but not executed. %s tables processed.', table_count);
            records := NULL;
            RAISE NOTICE 'Query generated but execution skipped.';
        END IF;

    EXCEPTION
        WHEN others THEN
            -- Capture error details
            GET STACKED DIAGNOSTICS error_context = PG_EXCEPTION_CONTEXT;
            error_message := format(
                'Generation ERROR: %s (SQLSTATE: %s). Context: %s',
                SQLERRM, SQLSTATE, error_context
            );
            
            execution_summary := 'Query generation failed';
            records := NULL;
            
            RAISE WARNING 'Error in get_attribute_metadata: %', error_message;
            
            -- Still return what we have so far
            generated_query := COALESCE(generated_query, 'No query generated due to error');
    END;

    -- Calculate execution time
    end_time := clock_timestamp();
    execution_time_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;

    -- Final log
    RAISE NOTICE 'Function completed in % ms. Success: %', 
                 execution_time_ms, (error_message IS NULL);

    RETURN NEXT;
END;
$function$
;
