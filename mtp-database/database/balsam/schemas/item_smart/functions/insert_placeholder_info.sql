--liquibase formatted sql
--changeset dodda.gowtham@impactanalytics.co:insert_placeholder_info stripComments:false runOnChange:true splitStatements:false context:query_updated labels:itemsmart_initial_commit
--comment: initial changeset for insert_placeholder_info
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.insert_placeholder_info(p_placeholder_type character varying,
p_filters jsonb,
    p_attributes json,
    p_entry_date date,
    p_exit_date date,
    p_is_cadence_generated boolean,
    p_is_mapped boolean,
    p_mapped_product_code character varying,
    p_created_by integer);
    
CREATE OR REPLACE FUNCTION item_smart.insert_placeholder_info(
    p_placeholder_type character varying,
    p_filters jsonb,
    p_attributes json,
    p_entry_date date,
    p_exit_date date,
    p_is_cadence_generated boolean,
    p_is_mapped boolean,
    p_mapped_product_code character varying,
    p_created_by integer
)
RETURNS TABLE(item varchar, product_name varchar)
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
    v_gen_random_uuid text  := gen_random_uuid()::varchar;
    p_mapped_product_code_description TEXT;
BEGIN
    -- Step 1: Generate the sequence values
    seq_value := nextval('item_smart.placeholder_id_seq');
    formatted_seq := LPAD(seq_value::TEXT, 2, '0');
    new_id := 'PH-' || formatted_seq;
    new_name := 'placeholder_' || formatted_seq;
    hier_code := nextval('global.product_hierarchies_filter_hierarchy_code_seq');

    -- Step 2: Process dynamic filters from JSONB
    FOR filter IN SELECT * FROM jsonb_array_elements(p_filters) LOOP
        filter_name := filter->>'attribute_name';
        filter_value := (filter->'value')::TEXT;
        filter_value := replace(replace(replace(filter_value, '[', ''), ']', ''), '"', '');

        -- Validate filter name is in allowed list
        IF filter_name NOT IN (
            -- Product hierarchy fields
            'l0_name', 'l1_name', 'l2_name', 'l3_name', 'l4_name', 'l5_name',
            -- Attribute fields
            'color', 'size', 'tree_shape', 'light_type', 'size_set_pack', 'print_catalog', 
            'drop_ship', 'channel_status', 'vendor', 'country_of_origin',
            -- Price and Cost fields
            'price', 'cost'
        ) THEN
            RAISE EXCEPTION 'Invalid filter name: %', filter_name;
        END IF;

        -- Handle numeric fields differently
        IF filter_name IN ('price', 'cost') THEN
            -- Validate numeric value
            IF NOT filter_value::TEXT ~ '^[0-9]+\.?[0-9]*$' THEN
                RAISE EXCEPTION 'Invalid numeric value for %: %', filter_name, filter_value;
            END IF;
            dynamic_values := dynamic_values || filter_value || ', ';
        ELSE
            dynamic_values := dynamic_values || quote_literal(filter_value) || ', ';
        END IF;

        dynamic_columns := dynamic_columns || filter_name || ', ';
    END LOOP;

    -- Trim trailing comma and space
    dynamic_columns := RTRIM(dynamic_columns, ', ');
    dynamic_values := RTRIM(dynamic_values, ', ');

    --adding mapped_product_code_description as article description
    EXECUTE format('SELECT item_description FROM item_smart.mv_product_hierarchies_filter WHERE article =  %L LIMIT 1', p_mapped_product_code )
    INTO p_mapped_product_code_description;

    -- Step 3: Construct the query
    constructed_query := format(
        'INSERT INTO item_smart.placeholders_info (
            item,
            product_code,
            product_name,
            product_description,
            product_type,
            hierarchy_code,
            %s,
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
            %L, %L, %L, %L, %L, %L, %s, %s::DATE, %s::DATE, %L, %L, %L, %L, now(), now(), %L
        )',
        dynamic_columns,
        new_id,
        new_id,
        new_name,
        p_placeholder_type,
        'Regular',
        hier_code,
        dynamic_values,
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

    -- perform sp log
    perform global.sp_log(v_gen_random_uuid, 'item_smart.insert_placeholder_info', 'before returning result', constructed_query, jsonb_build_object('p_placeholder_type',$1, 'p_filters',$2, 'p_attributes',$3, 'p_entry_date',$4, 'p_exit_date',$5, 'p_is_cadence_generated',$6, 'p_is_mapped',$7, 'p_mapped_product_code',$8, 'p_created_by',$9));

    -- Step 5: Return inserted values
    RETURN QUERY SELECT new_id::varchar, new_name::varchar;
END;
$function$;
