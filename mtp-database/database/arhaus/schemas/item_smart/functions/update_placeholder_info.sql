--liquibase formatted sql
--changeset kalyan.chandu@impactanalytics.co:update_placeholder_info runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:update_placeholder_info
--comment: initial changeset for update_placeholder_info
--rollback: SELECT 1
DROP FUNCTION IF EXISTS item_smart.update_placeholder_info(varchar, varchar, jsonb, json, date, date, bool, bool, varchar);

CREATE OR REPLACE FUNCTION item_smart.update_placeholder_info(p_placeholder_id character varying, p_placeholder_type character varying, p_filters jsonb, p_attributes json, p_entry_date date, p_exit_date date, p_is_cadence_generated boolean, p_is_mapped boolean, p_mapped_product_code character varying)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    filter JSONB;
    filter_name TEXT;
    filter_value TEXT;
    dynamic_set_clause TEXT := '';
    updated_count INTEGER;
	p_mapped_product_code_description TEXT;
BEGIN
    -- Extract dynamic filters from JSONB and construct the dynamic parts of the query
    FOR filter IN SELECT * FROM jsonb_array_elements(p_filters) LOOP
        filter_name := filter->>'attribute_name';
        filter_value := (filter->'value')::TEXT;

        -- Clean up the value to remove unnecessary characters
        filter_value := replace(filter_value, '[', '');
        filter_value := replace(filter_value, ']', '');
        filter_value := replace(filter_value, '"', '');

        dynamic_set_clause := dynamic_set_clause || format('%I = %L, ', filter_name, filter_value);
    END LOOP;
	
		--adding mapped_product_code_description
	EXECUTE format('SELECT product_description FROM item_smart.mv_product_hierarchies_filter WHERE product_code =  %L LIMIT 1', p_mapped_product_code )
    INTO p_mapped_product_code_description;
	
    -- Add the static parameters to the SET clause
    dynamic_set_clause := dynamic_set_clause ||
        format('product_type = %L, ', p_placeholder_type) ||
        format('attributes = %L, ', p_attributes::JSONB) ||
        format('entry_date = %L, ', p_entry_date) ||
        format('exit_date = %L, ', p_exit_date) ||
        format('is_cadence_generated = %L, ', p_is_cadence_generated) ||
        format('is_mapped = %L, ', p_is_mapped) ||
        format('mapped_product_code = %L, ', p_mapped_product_code) ||
		format('mapped_product_code_description = %L, ', p_mapped_product_code_description) ||
        'updated_at = now()';

    -- Remove the trailing comma and space if any
    dynamic_set_clause := RTRIM(dynamic_set_clause, ', ');

    -- Construct and execute the dynamic UPDATE statement
    EXECUTE format(
        'UPDATE item_smart.placeholders_info SET %s WHERE product_code = %L',
        dynamic_set_clause,
        p_placeholder_id
    );



    -- Get the number of rows affected by the update
    GET DIAGNOSTICS updated_count = ROW_COUNT;

    -- Return the count of updated records
    RETURN updated_count;
END;
$function$
;
