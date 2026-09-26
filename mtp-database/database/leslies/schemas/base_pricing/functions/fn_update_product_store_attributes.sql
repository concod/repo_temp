--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:fn_update_product_store_attributes_10 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.fn_update_product_store_attributes_10

DROP FUNCTION IF EXISTS base_pricing.fn_update_product_store_attributes;

CREATE OR REPLACE FUNCTION base_pricing.fn_update_product_store_attributes(updates_json jsonb, attribute_update_level text DEFAULT 'product-store-segment'::text)
 RETURNS TABLE(updated_count integer, total_input_count integer)
 LANGUAGE plpgsql
AS $function$
DECLARE
    input_count int;
    affected_count int;
    temp_table_count int;
    target_records_count int;
    attribute_updates_count int;
    update_start_time timestamp;
    update_end_time timestamp;
    query_execution_time interval;
    target_table_name text := 'bp_product_store_attributes_mapping_v4';
    actual_update_query text;
    column_exists boolean;
    rec record;
    attr_key text;
    attr_value text;
    set_clause text;
BEGIN
    -- Start timing
    update_start_time := clock_timestamp();
    
    -- Log function call
    RAISE NOTICE 'Function fn_update_product_store_attributes called with update_level: %, input_records: %', 
        attribute_update_level, jsonb_array_length(updates_json);
    
    -- Get count of input records
    input_count := jsonb_array_length(updates_json);
    RAISE NOTICE 'Processing % input records', input_count;

    -- Create temporary table for updates with proper indexing
    RAISE NOTICE 'Creating temporary table for updates...';
    CREATE TEMPORARY TABLE temp_updates ON COMMIT DROP AS
    SELECT 
        (item->>'product_id')::int AS product_id,
        (item->>'store_id')::int AS store_id,
        (item->>'segment_id')::int AS segment_id,
        item - 'product_id' - 'store_id' - 'segment_id' AS attributes_to_update
    FROM jsonb_array_elements(updates_json) AS item;

    GET DIAGNOSTICS temp_table_count = ROW_COUNT;
    RAISE NOTICE 'Created temporary table with % records', temp_table_count;

    CREATE INDEX idx_temp_updates_product ON temp_updates (product_id);
    CREATE INDEX idx_temp_updates_composite ON temp_updates (product_id, store_id, segment_id);
    RAISE NOTICE 'Temporary table indexes created';

    -- Check if the table has attribute_name column (for debugging)
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'base_pricing' 
        AND table_name = 'bp_product_store_attributes_mapping_v4'
        AND column_name = 'attribute_name'
    ) INTO column_exists;
    
    RAISE NOTICE 'Table has attribute_name column: %', column_exists;

    -- Use a more efficient update approach with CTE
    RAISE NOTICE 'Starting update process...';
   
    -- First, let's identify the target records
    CREATE TEMPORARY TABLE temp_target_records AS
    SELECT 
        target.*, 
        upd.attributes_to_update
    FROM base_pricing.bp_product_store_attributes_mapping_v4 target
    JOIN temp_updates upd ON target.product_id = upd.product_id
    AND CASE attribute_update_level
        WHEN 'product' THEN true
        WHEN 'product-store' THEN (upd.store_id IS NULL OR target.store_id = upd.store_id)
        WHEN 'product-segment' THEN (upd.segment_id IS NULL OR target.segment_id = upd.segment_id)
        ELSE (upd.store_id IS NULL OR target.store_id = upd.store_id)
             AND (upd.segment_id IS NULL OR target.segment_id = upd.segment_id)
    END;

    GET DIAGNOSTICS target_records_count = ROW_COUNT;
    RAISE NOTICE 'Found % target records to potentially update', target_records_count;

    -- If no records found, return early
    IF target_records_count = 0 THEN
        RAISE NOTICE 'No matching records found for update';
        DROP TABLE temp_updates;
        DROP TABLE temp_target_records;
        RETURN QUERY SELECT 0, input_count;
        RETURN;
    END IF;

    -- Count individual attribute updates
    SELECT COUNT(*)
    INTO attribute_updates_count
    FROM temp_target_records ttr,
    jsonb_each(ttr.attributes_to_update) AS attr_updates;
    
    RAISE NOTICE 'Individual attribute updates to perform: %', attribute_updates_count;

    -- Dynamic update based on actual table structure
    RAISE NOTICE 'Performing dynamic updates based on table structure...';
    
    -- Build and execute dynamic UPDATE statements for each attribute
    affected_count := 0;
    
    FOR rec IN 
        SELECT DISTINCT
            ttr.product_id,
            ttr.store_id, 
            ttr.segment_id,
            jsonb_object_agg(attr_updates.key, attr_updates.value) as update_data
        FROM temp_target_records ttr,
        jsonb_each(ttr.attributes_to_update) AS attr_updates
        GROUP BY ttr.product_id, ttr.store_id, ttr.segment_id
    LOOP
        -- Build the SET clause dynamically
        set_clause := '';
        
        -- Add each attribute to update
        FOR attr_key, attr_value IN 
            SELECT key, value 
            FROM jsonb_each_text(rec.update_data)
        LOOP
            IF set_clause != '' THEN
                set_clause := set_clause || ', ';
            END IF;
            
            set_clause := set_clause || 
                quote_ident(attr_key) || ' = ' ||
                CASE 
                    WHEN attr_value = 'true' THEN 'true'
                    WHEN attr_value = 'false' THEN 'false'
                    WHEN attr_value ~ '^-?\d+$' THEN attr_value
                    WHEN attr_value ~ '^-?\d+\.\d+$' THEN attr_value
                    ELSE quote_literal(attr_value)
                END;
        END LOOP;
        
        -- Build the complete update query
        actual_update_query := 'UPDATE base_pricing.bp_product_store_attributes_mapping_v4 SET ' ||
                            set_clause || ', ' ||
                            'updated_at = CURRENT_TIMESTAMP ' ||
                            'WHERE product_id = ' || rec.product_id ||
                            ' AND store_id = ' || rec.store_id ||
                            ' AND segment_id = ' || rec.segment_id;
        
        RAISE NOTICE 'Executing: %', actual_update_query;
        EXECUTE actual_update_query;
        GET DIAGNOSTICS affected_count = ROW_COUNT;
        RAISE NOTICE 'Updated % rows with this query', affected_count;
    END LOOP;

    -- Log detailed execution information
    update_end_time := clock_timestamp();
    query_execution_time := update_end_time - update_start_time;
    
    RAISE NOTICE 'Update completed:';
    RAISE NOTICE '  - Target records matched: %', target_records_count;
    RAISE NOTICE '  - Individual attribute updates: %', attribute_updates_count;
    RAISE NOTICE '  - Successfully updated records: %', affected_count;
    RAISE NOTICE '  - Execution time: %', query_execution_time;
    RAISE NOTICE '  - Update level: %', attribute_update_level;

    -- Clean up
    DROP TABLE temp_updates;
    DROP TABLE temp_target_records;
    RAISE NOTICE 'Temporary tables cleaned up';

    -- Log final results
    RAISE NOTICE 'Function completed: Updated % out of % input records', affected_count, input_count;
    
    -- Return counts
    RETURN QUERY SELECT affected_count, input_count;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log error details
        RAISE NOTICE 'Error occurred in fn_update_product_store_attributes: %', SQLERRM;
        
        -- Debug: Show table structure
        RAISE NOTICE 'Table structure for base_pricing.bp_product_store_attributes_mapping_v4:';
        RAISE NOTICE '%', (
            SELECT string_agg(column_name || ' ' || data_type, ', ')
            FROM information_schema.columns 
            WHERE table_schema = 'base_pricing' 
            AND table_name = 'bp_product_store_attributes_mapping_v4'
        );
        
        -- Ensure temporary tables are dropped even on error
        DROP TABLE IF EXISTS temp_updates;
        DROP TABLE IF EXISTS temp_target_records;
        
        RAISE EXCEPTION 'Error in fn_update_product_store_attributes: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END;
$function$
;