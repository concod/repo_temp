--liquibase formatted sql
--changeset dodda.gowtham@impactanalytics.co:insert_placeholder_info stripComments:false runOnChange:true splitStatements:false context:query_updated labels:itemsmart_initial_commit
--comment: initial changeset for insert_placeholder_info
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.update_placeholder_info(
    p_product_code character varying,
    p_product_type character varying,
    p_filters jsonb,
    p_attributes json,
    p_entry_date date,
    p_exit_date date,
    p_is_cadence_generated boolean,
    p_is_mapped boolean,
    p_mapped_product_code character varying
);

CREATE OR REPLACE FUNCTION item_smart.update_placeholder_info(
    p_product_code character varying,
    p_product_type character varying,
    p_filters jsonb,
    p_attributes json,
    p_entry_date date,
    p_exit_date date,
    p_is_cadence_generated boolean,
    p_is_mapped boolean,
    p_mapped_product_code character varying
)
RETURNS integer
LANGUAGE plpgsql
AS $function$
DECLARE
    filter JSONB;
    filter_name TEXT;
    filter_value TEXT;
    attr_key TEXT;
    attr_value TEXT;
    dynamic_set_clause TEXT := '';
    updated_count INTEGER;
    v_gen_random_uuid text  := gen_random_uuid()::varchar;
    p_mapped_product_code_description TEXT;
BEGIN
    RAISE NOTICE 'Starting update_placeholder_info for product_code: %', p_product_code;
    RAISE NOTICE 'Initial filters received: %', p_filters;
    RAISE NOTICE 'Initial attributes received: %', p_attributes;

    -- Extract dynamic filters from JSONB and construct the dynamic parts of the query
    FOR filter IN SELECT * FROM jsonb_array_elements(p_filters) LOOP
        filter_name := filter->>'attribute_name';
        filter_value := (filter->'value')::TEXT;

        -- Clean up the value to remove unnecessary characters
        filter_value := replace(filter_value, '[', '');
        filter_value := replace(filter_value, ']', '');
        filter_value := replace(filter_value, '"', '');

        RAISE NOTICE 'Processing filter - Name: %, Value: %', filter_name, filter_value;
        dynamic_set_clause := dynamic_set_clause || format('%I = %L, ', filter_name, filter_value);
    END LOOP;

    RAISE NOTICE 'Dynamic filters processing complete. Current SET clause: %', dynamic_set_clause;

    -- Extract attributes from JSON and map them to the flattened schema columns
    FOR attr_key, attr_value IN SELECT * FROM json_each_text(p_attributes) LOOP
        RAISE NOTICE 'Processing attribute - Key: %, Value: %', attr_key, attr_value;
        
        -- Check if this is the nested attributes object
        IF attr_key = 'attributes' THEN
            -- Process the nested attributes JSON - treat keys as column names directly
            DECLARE
                nested_attr_key TEXT;
                nested_attr_value TEXT;
            BEGIN
                FOR nested_attr_key, nested_attr_value IN SELECT * FROM json_each_text(attr_value::json) LOOP
                    RAISE NOTICE 'Processing nested attribute - Key: %, Value: %', nested_attr_key, nested_attr_value;
                    dynamic_set_clause := dynamic_set_clause || format('%I = %L, ', nested_attr_key, nested_attr_value);
                END LOOP;
            END;
        ELSE
            -- Handle non-nested attributes (direct mapping to columns)
            dynamic_set_clause := dynamic_set_clause || format('%I = %L, ', attr_key, attr_value);
        END IF;
    END LOOP;

    RAISE NOTICE 'Dynamic attributes processing complete. Current SET clause: %', dynamic_set_clause;

    --adding mapped_product_code_description
    EXECUTE format('SELECT product_description FROM item_smart.mv_product_hierarchies_filter WHERE product_code =  %L LIMIT 1', p_mapped_product_code )
    INTO p_mapped_product_code_description;

    -- Add the static parameters to the SET clause
    dynamic_set_clause := dynamic_set_clause ||
        format('product_type = %L, ', p_product_type) ||
        format('entry_date = %L, ', p_entry_date) ||
        format('exit_date = %L, ', p_exit_date) ||
        format('is_cadence_generated = %L, ', p_is_cadence_generated) ||
        format('is_mapped = %L, ', p_is_mapped) ||
        format('mapped_product_code = %L, ', p_mapped_product_code) ||
        format('mapped_product_description = %L, ', p_mapped_product_code_description) ||
        format('mapped_product_code_description = %L, ', p_mapped_product_code_description) ||
        'updated_at = now()';

    -- Remove the trailing comma and space if any
    dynamic_set_clause := RTRIM(dynamic_set_clause, ', ');

    RAISE NOTICE 'Final SET clause after adding static parameters: %', dynamic_set_clause;

    -- Log the complete UPDATE query before execution
    RAISE NOTICE 'Executing UPDATE query: %', format(
        'UPDATE item_smart.placeholders_info SET %s WHERE product_code = %L',
        dynamic_set_clause,
        p_product_code
    );

    -- Construct and execute the dynamic UPDATE statement
    EXECUTE format(
        'UPDATE item_smart.placeholders_info SET %s WHERE product_code = %L',
        dynamic_set_clause,
        p_product_code
    );

    -- Get the number of rows affected by the update
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    RAISE NOTICE 'Update complete. Number of rows affected: %', updated_count;

    -- sp log
    perform global.sp_log(v_gen_random_uuid, 'item_smart.update_placeholder_info', 'before returning updated_count', dynamic_set_clause, jsonb_build_object('p_product_code',$1, 'p_product_type',$2, 'p_filters',$3, 'p_attributes',$4, 'p_entry_date',$5, 'p_exit_date',$6, 'p_is_cadence_generated',$7, 'p_is_mapped',$8, 'p_mapped_product_code',$9));

    -- Return the count of updated records
    RETURN updated_count;
END;
$function$;
