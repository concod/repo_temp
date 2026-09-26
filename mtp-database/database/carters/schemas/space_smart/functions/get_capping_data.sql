--liquibase formatted sql
--changeset hemanth.cs@impactanalytics.co:get_capping_data_sp_update runOnChange:true stripComments:false splitStatements:false context:MTP-81867 labels:liquibase_project_start
--comment: MTP-76856 Updating SP to get the capping data for previous size data and fetch the data from store_metrics_age table
--rollback: SELECT 1

DROP FUNCTION IF EXISTS space_smart.get_capping_data(text[], text, text[]);

CREATE OR REPLACE FUNCTION space_smart.get_capping_data(parent_block_sizes text[], season text, in_l4_names text[])
RETURNS TABLE(
    l4_name text,
    l5_name text,
    parent_block text,
    optimized_min_cc numeric,
    optimized_max_cc numeric
)
LANGUAGE plpgsql
AS $function$
    /*
    Function/Procedure name: space_smart.get_capping_data
    Created by: Hemanth C S
    Created at: 20-Mar-2025
    Updated by: Hemanth C S
    Updated at: 10-Apr-2025
    No of input parameter: 3
    Parameter Description : $1 = parent_block_sizes (array of sizes), $2 = season, $3 = in_l4_names (array of l4_names)

    Purpose: This function determines the appropriate capping data based on parent block sizes, 
             retrieving the metrics from the previous size in the ordering sequence.
             Can handle multiple parent_block_size values and multiple l4_name values.

    Calling Statement:
    SELECT * FROM space_smart.get_capping_data('{"S", "M", "L"}', '30', '{"INFANT", "TODDLER"}');
    */
DECLARE
    previous_size TEXT;
    current_order INTEGER;
    capping_query TEXT;
    size_exists BOOLEAN;
    normalized_parent_block_size TEXT;
    result_query TEXT := '';
    parent_block_size TEXT;
    available_sizes TEXT[];
    ordered_available_sizes TEXT[];
    size_order_array TEXT[];
BEGIN
    -- Create temporary table to accumulate results from each parent block size
    CREATE TEMP TABLE temp_results (
        l4_name text,
        l5_name text,
        parent_block text,
        optimized_min_cc numeric,
        optimized_max_cc numeric
    ) ON COMMIT DROP;

    -- Get the size ordering array from tenant_attribute_master
    SELECT array_agg(element ORDER BY ordinality) INTO size_order_array
    FROM global.tenant_attribute_master tam,
    jsonb_array_elements_text(tam.attribute_value->'value') WITH ORDINALITY AS t(element, ordinality)
    WHERE tam.name = 'size_order_for_space_smart';

    -- Get available sizes from store_metrics_age for the given season and l4 names
    EXECUTE format('
        SELECT array_agg(DISTINCT parent_block)
        FROM space_smart.store_metrics_age 
        WHERE season = %L 
        AND l4_name = ANY(%L)
        AND status = ''Approved''', 
        season, in_l4_names)
    INTO available_sizes;

    RAISE NOTICE 'Available sizes: %', available_sizes;

    -- Order available sizes according to the size_order_array
    WITH ordered_sizes AS (
        SELECT element
        FROM unnest(size_order_array) AS element
        WHERE element = ANY(available_sizes)
        ORDER BY array_position(size_order_array, element)
    )
    SELECT array_agg(element) INTO ordered_available_sizes FROM ordered_sizes;

    RAISE NOTICE 'Ordered available sizes: %', ordered_available_sizes;

    -- Process each parent_block_size from input, but only if it exists in ordered_available_sizes
    FOREACH parent_block_size IN ARRAY parent_block_sizes
    LOOP
        -- Normalize the input size to uppercase for case-insensitive comparison
        normalized_parent_block_size := UPPER(parent_block_size);
        
        -- Check if parent_block_size exists in the ordering list (case-insensitive)
        SELECT EXISTS(
            SELECT 1 FROM global.tenant_attribute_master tam,
            jsonb_array_elements_text(tam.attribute_value->'value') WITH ORDINALITY AS t(element, ordinality)
            WHERE tam.name = 'size_order_for_space_smart' AND UPPER(element) = normalized_parent_block_size
        ) INTO size_exists;
        
        IF NOT size_exists THEN
            RAISE EXCEPTION 'Invalid parent_block_size: %. Size not found in size_order_for_space_smart.', parent_block_size;
        END IF;

        -- Check if the size is available in our ordered_available_sizes
        IF NOT normalized_parent_block_size = ANY(
            SELECT UPPER(element) FROM unnest(ordered_available_sizes) AS element
        ) THEN
            RAISE NOTICE 'Size % not available in the current data, skipping.', parent_block_size;
            CONTINUE;
        END IF;

        -- Skip first element in the ordered available sizes list as there's no previous size
        IF normalized_parent_block_size = UPPER(ordered_available_sizes[1]) THEN
            RAISE NOTICE 'Size % is the first in ordering, skipping.', parent_block_size;
            CONTINUE;
        END IF;

        -- Find the order of the current parent_block_size in the ordered_available_sizes
        SELECT array_position(ordered_available_sizes, parent_block_size) INTO current_order;
        
        -- Find the previous size based on order
        previous_size := ordered_available_sizes[current_order - 1];
        
        -- Build and execute the CAPPING QUERY with the previous size as parent_block
        capping_query := 'INSERT INTO temp_results
        SELECT sm.l4_name::text, sm.l5_name::text, 
               ' || quote_literal(previous_size) || '::text AS parent_block,
               MIN(sm.optimized_min_cc)::numeric AS optimized_min_cc, 
               MAX(sm.optimized_max_cc)::numeric AS optimized_max_cc
        FROM space_smart.store_metrics sm 
        WHERE sm.season = ' || quote_literal(season) || 
             ' AND UPPER(sm.parent_block) = UPPER(' || quote_literal(previous_size) || ')' || 
             ' AND sm.l4_name = ANY(' || quote_literal(in_l4_names) || '::text[])' || '
        GROUP BY sm.l4_name, sm.l5_name';

        RAISE NOTICE 'Executing query for %: %', parent_block_size, capping_query;
        EXECUTE capping_query;
    END LOOP;

    -- Return all accumulated results
    RETURN QUERY SELECT * FROM temp_results;
END
$function$;