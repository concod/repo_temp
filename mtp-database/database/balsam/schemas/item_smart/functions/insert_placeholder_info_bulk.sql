--liquibase formatted sql
--changeset dodda.gowtham@impactanalytics.co:insert_placeholder_info_bulk stripComments:false runOnChange:true splitStatements:false context:query_updated labels:itemsmart_initial_commit
--comment: initial changeset for insert_placeholder_info_bulk function for creating multiple placeholders in a single transaction
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.insert_placeholder_info_bulk(
    p_placeholder_type character varying,
    p_filters jsonb,
    p_attributes json,
    p_entry_date date,
    p_exit_date date,
    p_is_cadence_generated boolean,
    p_is_mapped boolean,
    p_mapped_product_code character varying,
    p_created_by integer,
    p_number_of_placeholders integer
);

CREATE OR REPLACE FUNCTION item_smart.insert_placeholder_info_bulk(
    p_placeholder_type character varying,
    p_filters jsonb,
    p_attributes json,
    p_entry_date date,
    p_exit_date date,
    p_is_cadence_generated boolean,
    p_is_mapped boolean,
    p_mapped_product_code character varying,
    p_created_by integer,
    p_number_of_placeholders integer
)
RETURNS TABLE(placeholder_id character varying, product_name character varying)
LANGUAGE plpgsql
AS $function$
DECLARE
    new_ids varchar(10)[];
    new_names VARCHAR(100)[];
    hier_codes INT[];
    filter JSONB;
    filter_name TEXT;
    filter_value TEXT;
    dynamic_columns TEXT := '';
    dynamic_values TEXT := '';
    constructed_query TEXT;
    value_rows TEXT := '';
    v_gen_random_uuid text := gen_random_uuid()::varchar;
    i INTEGER;
    base_counter INTEGER;
    p_mapped_product_code_description TEXT;
BEGIN
    IF p_number_of_placeholders <= 0 THEN
        RAISE EXCEPTION 'Number of placeholders must be greater than 0';
    END IF;

    -- Initialize arrays to store multiple IDs and names
    new_ids := ARRAY[]::varchar(10)[];
    new_names := ARRAY[]::VARCHAR(100)[];
    hier_codes := ARRAY[]::INT[];

    -- Get a base counter for generating unique IDs
    SELECT COALESCE(MAX(CAST(SUBSTRING(pi.placeholder_id FROM 4) AS INTEGER)), 0) + 1
    INTO base_counter
    FROM item_smart.placeholders_info pi
    WHERE pi.placeholder_id ~ '^PH-[0-9]+$';

    -- Generate placeholder IDs and names for all placeholders
    FOR i IN 1..p_number_of_placeholders LOOP
        new_ids := array_append(new_ids, 'PH-' || (base_counter + i - 1)::TEXT);
        new_names := array_append(new_names, 'placeholder_' || (base_counter + i - 1)::TEXT);
        hier_codes := array_append(hier_codes, nextval('global.product_hierarchies_filter_hierarchy_code_seq'));
    END LOOP;

    --adding mapped_product_code_description
    EXECUTE format('SELECT product_description FROM item_smart.mv_product_hierarchies_filter WHERE product_code =  %L LIMIT 1', p_mapped_product_code )
    INTO p_mapped_product_code_description;

    -- Process dynamic filters from JSONB
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
            'drop_ship', 'channel_status', 'vendor', 'country_of_origin', 'lifecycle',
            -- Price and Cost fields
            'price', 'cost'
        ) THEN
            RAISE EXCEPTION 'Invalid filter name: %', filter_name;
        END IF;

        -- Handle numeric fields differently
        IF filter_name IN ('price', 'cost', 'size_set_pack') THEN
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

    -- Process dynamic attributes from JSON (flattened structure)
    DECLARE
        attr_key TEXT;
        attr_value TEXT;
    BEGIN
        FOR attr_key, attr_value IN SELECT * FROM json_each_text(p_attributes) LOOP
            RAISE NOTICE 'Processing attribute - Key: %, Value: %', attr_key, attr_value;
            
            -- Validate attribute name is in allowed list
            IF attr_key NOT IN (
                -- Attribute fields from table schema
                'color', 'size', 'tree_shape', 'light_type', 'size_set_pack', 'print_catalog', 
                'drop_ship', 'channel_status', 'vendor', 'country_of_origin', 'lifecycle',
                -- Price and Cost fields
                'price', 'cost'
            ) THEN
                RAISE EXCEPTION 'Invalid attribute name: %', attr_key;
            END IF;

            -- Handle numeric fields differently
            IF attr_key IN ('price', 'cost', 'size_set_pack') THEN
                -- Validate numeric value
                IF NOT attr_value::TEXT ~ '^[0-9]+\.?[0-9]*$' THEN
                    RAISE EXCEPTION 'Invalid numeric value for %: %', attr_key, attr_value;
                END IF;
                dynamic_values := dynamic_values || attr_value || ', ';
            ELSE
                dynamic_values := dynamic_values || quote_literal(attr_value) || ', ';
            END IF;

            dynamic_columns := dynamic_columns || attr_key || ', ';
        END LOOP;
    END;

    -- Trim trailing comma and space
    dynamic_columns := RTRIM(dynamic_columns, ', ');
    dynamic_values := RTRIM(dynamic_values, ', ');

    -- Generate value rows for all placeholders
    FOR i IN 1..p_number_of_placeholders LOOP
        value_rows := value_rows || format(
            '(%L, %L, %L, %L, %L, %L, %L, %s, %s::DATE, %s::DATE, %L, %L, %L, %L, %L, now(), now(), %L)',
            new_ids[i],                    -- placeholder_id
            'ITEM-' || new_ids[i]::TEXT,   -- item (NOT NULL)
            'ITEM-' || new_ids[i]::TEXT,   -- product_code
            new_names[i],                  -- product_name
            p_placeholder_type,            -- product_description
            'Regular',                     -- product_type
            hier_codes[i],                 -- hierarchy_code
            dynamic_values,                -- dynamic columns from filters
            COALESCE(quote_nullable(p_entry_date), 'NULL'),
            COALESCE(quote_nullable(p_exit_date), 'NULL'),
            p_is_cadence_generated,
            p_is_mapped,
            p_mapped_product_code,
            p_mapped_product_code_description,  -- mapped_product_description
            p_mapped_product_code_description,  -- mapped_product_code_description
            p_created_by
        );
        
        IF i < p_number_of_placeholders THEN
            value_rows := value_rows || ',';
        END IF;
    END LOOP;

    -- Construct the final query
    constructed_query := format(
        'INSERT INTO item_smart.placeholders_info (
            placeholder_id,
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
            mapped_product_description,
            mapped_product_code_description,
            created_at,
            updated_at,
            created_by
        ) VALUES %s',
        dynamic_columns,
        value_rows
    );

    -- Execute the query
    RAISE NOTICE 'Constructed Query: %', constructed_query;
    EXECUTE constructed_query;
    RAISE NOTICE 'Bulk INSERT completed successfully.';

    -- perform sp log
    perform global.sp_log(v_gen_random_uuid, 'item_smart.insert_placeholder_info_bulk', 'before returning result', constructed_query, jsonb_build_object('p_placeholder_type',$1, 'p_filters',$2, 'p_attributes',$3, 'p_entry_date',$4, 'p_exit_date',$5, 'p_is_cadence_generated',$6, 'p_is_mapped',$7, 'p_mapped_product_code',$8, 'p_created_by',$9, 'p_number_of_placeholders',$10));

    -- Return all inserted values
    RETURN QUERY 
    SELECT ph.placeholder_id::varchar, ph.product_name
    FROM item_smart.placeholders_info ph
    WHERE ph.placeholder_id = ANY(new_ids);
END;
$function$; 