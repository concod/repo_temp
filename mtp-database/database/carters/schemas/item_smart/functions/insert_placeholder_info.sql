--liquibase formatted sql
--changeset kalyan.chandu@impactanalytics.co:ph-new-sku runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:item_smart_initial_commit_ph-new-sku
--comment: initial changeset for ph-new-sku
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.insert_placeholder_info(varchar, jsonb, json, date, date, bool, bool, varchar, int4);

CREATE OR REPLACE FUNCTION item_smart.insert_placeholder_info(p_placeholder_type character varying, p_filters jsonb, p_attributes json, p_entry_date date, p_exit_date date, p_is_cadence_generated boolean, p_is_mapped boolean, p_mapped_product_code character varying, p_created_by integer)
 RETURNS TABLE(placeholder_id character varying, placeholder_name character varying)
 LANGUAGE plpgsql
AS $function$
DECLARE
    new_id VARCHAR(10);
    seq_value BIGINT;
    new_name VARCHAR(20);
    hier_code INT;
    key TEXT;
    value TEXT;
    filter JSONB;
    filter_name TEXT;
    filter_value TEXT;
    dynamic_columns TEXT := '';
    dynamic_values TEXT := '';
	p_mapped_product_code_description TEXT;
BEGIN
    -- Get the next value from the sequence for placeholder_id
    seq_value := nextval('item_smart.placeholder_id_seq');

	new_id := 'PH-' || seq_value::TEXT;

    -- Generate the new placeholder_name
    new_name := 'placeholder_' || seq_value::TEXT;

    -- Get the next value from the sequence for hierarchy_code
    hier_code := nextval('global.product_hierarchies_filter_hierarchy_code_seq');

    -- Extract dynamic filters from JSONB and construct the dynamic parts of the query
    FOR filter IN SELECT * FROM jsonb_array_elements(p_filters) LOOP
        filter_name := filter->>'attribute_name';
        filter_value := (filter->'value')::TEXT;

        -- Clean up the value to remove unnecessary characters
        filter_value := replace(filter_value, '[', '');
        filter_value := replace(filter_value, ']', '');
        filter_value := replace(filter_value, '"', '');

        dynamic_columns := dynamic_columns || filter_name || ', ';
        dynamic_values := dynamic_values || quote_literal(filter_value) || ', ';
    END LOOP;

    -- Remove the trailing comma and space
    dynamic_columns := RTRIM(dynamic_columns, ', ');
    dynamic_values := RTRIM(dynamic_values, ', ');

	--adding mapped_product_code_description
	EXECUTE format('SELECT style_description FROM item_smart.mv_product_hierarchies_filter WHERE style =  %L LIMIT 1', p_mapped_product_code )
    INTO p_mapped_product_code_description;

    -- Construct and execute the dynamic INSERT statement
    EXECUTE format(
        'INSERT INTO item_smart.placeholders_info (
            style,
			product_code,
            style_description,
            product_type,
            hierarchy_code,
            %s,
            attributes,
            entry_date,
            exit_date,
            is_cadence_generated,
            is_mapped,
            mapped_product_code,
			mapped_product_code_description,
            created_at,
            updated_at,
            created_by
        ) VALUES (
            %L, %L, %L, %L, %L, %s, %L, %L, %L, %L, %L, %L, %L, now(), now(), %L
        )',
        dynamic_columns,
        new_id,
		new_id,
        new_name,
        p_placeholder_type,
        hier_code,
        dynamic_values,
        p_attributes::JSONB,
        p_entry_date,
        p_exit_date,
        p_is_cadence_generated,
        p_is_mapped,
        p_mapped_product_code,
		p_mapped_product_code_description,
        p_created_by
    );

    -- Return the inserted values
    RETURN QUERY SELECT new_id, new_name;
END;
$function$
;
