--liquibase formatted sql
--changeset pundarikaksha.mishra@impactanalytics.co:insert_placeholder_info stripComments:false runOnChange:true splitStatements:false context:query_updated labels:itemsmart_initial_commit-1
--comment: initial changeset for insert_placeholder_info-1
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.insert_placeholder_info(
    p_placeholder_type character varying,
    p_filters jsonb,
    p_attributes json,
    p_entry_date date,
    p_exit_date date,
    p_is_cadence_generated boolean,
    p_is_mapped boolean,
    p_mapped_product_code character varying,
    p_created_by integer);
    
CREATE OR REPLACE FUNCTION item_smart.insert_placeholder_info(p_placeholder_type character varying, 
p_filters jsonb, p_attributes json, p_entry_date date, p_exit_date date, 
p_is_cadence_generated boolean, p_is_mapped boolean, p_mapped_product_code character varying, 
p_created_by integer)
 RETURNS TABLE(placeholder_id character varying, placeholder_name character varying)
 LANGUAGE plpgsql
AS $function$
DECLARE
    new_id VARCHAR(10);
    seq_value BIGINT;
    formatted_seq TEXT;
    new_name VARCHAR(20);
    hier_code INT;
    filter JSONB;
    filter_name TEXT;
    filter_value TEXT;
    dynamic_columns TEXT := '';
    dynamic_values TEXT := '';
    constructed_query TEXT;
	p_mapped_product_code_description TEXT;
BEGIN
    -- Step 1: Generate the sequence values
    seq_value := nextval('item_smart.placeholder_id_seq');
    new_id := 'PH-' || seq_value::TEXT;
    -- Generate the new placeholder_name
    new_name := 'placeholder_' || seq_value::TEXT;
    hier_code := nextval('global.product_hierarchies_filter_hierarchy_code_seq');

    -- Step 2: Process dynamic filters from JSONB
    FOR filter IN SELECT * FROM jsonb_array_elements(p_filters) LOOP
        filter_name := filter->>'attribute_name';
        filter_value := (filter->'value')::TEXT;
        filter_value := replace(replace(replace(filter_value, '[', ''), ']', ''), '"', '');

        dynamic_columns := dynamic_columns || filter_name || ', ';
        dynamic_values := dynamic_values || quote_literal(filter_value) || ', ';
    END LOOP;

    -- Trim trailing comma and space
    dynamic_columns := RTRIM(dynamic_columns, ', ');
    dynamic_values := RTRIM(dynamic_values, ', ');

	--adding mapped_product_code_description as article description
	EXECUTE format('SELECT product_description FROM item_smart.mv_product_hierarchies_filter WHERE product_code =  %L LIMIT 1', p_mapped_product_code )
    INTO p_mapped_product_code_description;

    -- Step 3: Construct the query
    constructed_query := format(
        'INSERT INTO item_smart.placeholders_info (
            article,
            product_code,
            product_name,
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
            %L, %L, %L, %L, %L, %s, %L, %s::DATE, %s::DATE, %L, %L, %L,%L, now(), now(), %L
        )',
        dynamic_columns,
        new_id,
        new_id,
        new_name,
        p_placeholder_type,
        hier_code,
        dynamic_values,
        p_attributes::JSONB,
        COALESCE(quote_nullable(p_entry_date), 'NULL'),
        COALESCE(quote_nullable(p_exit_date), 'NULL'),
        p_is_cadence_generated,
        p_is_mapped,
        p_mapped_product_code,
		p_mapped_product_code_description,
        p_created_by
    );

    -- Step 4: Execute the query
    RAISE NOTICE 'Constructed Query: %', constructed_query;
    EXECUTE constructed_query;
    RAISE NOTICE 'Dynamic INSERT completed successfully.';

    -- Step 5: Return inserted values
    RETURN QUERY SELECT new_id, new_name;
END;
$function$
;