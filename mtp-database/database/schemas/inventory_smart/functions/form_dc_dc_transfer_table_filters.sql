--liquibase formatted sql
--changeset liquibase:form_dc_dc_transfer_table_filters runOnChange:true stripComments:false splitStatements:false context:MTP-93869 labels:MTP-93869
--comment: Updated SP form_dc_dc_transfer_table_filters to support meta_filters for dynamic WHERE clause generation. Added IF EXISTS clause to safely drop the function if it exists. Updated SP to handle meta filters.
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.form_dc_dc_transfer_table_filters(text, jsonb, jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.form_dc_dc_transfer_table_filters(input text, _product_attributes_filter jsonb, _meta_filters jsonb)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    _key text;
    _value text;
    _filter text;
    _dt text;
    _con text[] := '{}';
    _where text := '';
    _dimension text;
    _list_values text;
    _group_pkey text;
    _group_filter text := '';
    _meta_filter jsonb;
    _search_type text;
    _pattern text;
    _column text;
    _query_type text := 'AND';
BEGIN
    _dimension := split_part($1, '_', 1);

    -- Step 1: Process _product_attributes_filter
    FOR _key, _value IN SELECT * FROM jsonb_each_text(_product_attributes_filter) WHERE value IS NOT NULL LOOP
        _value := regexp_replace(_value::text, $$([^'])'([^'])$$, $$\1''\2$$, 'g');
        
        SELECT coalesce(max(udt_name), 'varchar') INTO _dt 
        FROM information_schema.columns 
        WHERE table_schema = 'inventory_smart' 
        AND table_name = $1 
        AND column_name = _key;
        
        FOR _filter IN SELECT * FROM json_array_elements(_value::json) LOOP
            IF (_filter::json)->>'type' = 'custom' THEN
                IF (_filter::json)->>'values' = 'null' THEN
                    _con := array_append(_con, '(hierarchy->>''' || _key || '''::' || _dt || ' ' || ((_filter::json)->>'operator') || ' ' || ((_filter::json)->>'values') || ')');
                ELSE
                    _con := array_append(_con, '(hierarchy->>''' || _key || '''::' || _dt || ' ' || ((_filter::json)->>'operator') || ' ''' || ((_filter::json)->>'values') || '''::' || _dt || ')');
                END IF;
            ELSIF (_filter::json)->>'type' = 'list' THEN
                IF (_filter::json)->>'operator' = 'in' THEN
                    _con := array_append(_con, '(hierarchy->>''' || _key || '''::' || _dt || ' = any(''' || replace(replace((_filter::json)->>'values', '[', '{'), ']', '}''') || '::' || _dt || '[]))');
                ELSE
                    _con := array_append(_con, 'NOT(hierarchy->>''' || _key || '''::' || _dt || ' = any(''' || replace(replace((_filter::json)->>'values', '[', '{'), ']', '}''') || '::' || _dt || '[]))');
                END IF;
            ELSIF (_filter::json)->>'type' = 'expression' THEN
                _con := array_append(_con, '(hierarchy->>''' || _key || '''::' || _dt || ' ' || ((_filter::json)->>'operator') || ')');
            END IF;
        END LOOP;
    END LOOP;
	
	-- Step 2: Process _meta_filters
	IF _meta_filters IS NOT NULL THEN
	    _query_type := _meta_filters->>'query_type';
	
	    FOR _meta_filter IN SELECT * FROM jsonb_array_elements(_meta_filters->'search') LOOP
	        _column := _meta_filter->>'column';
	        _pattern := _meta_filter->>'pattern';
	        _search_type := _meta_filter->>'search_type';
	        _dt := 'varchar';
	
	        -- Determine if column exists in the table directly
	        SELECT coalesce(max(udt_name), 'varchar') INTO _dt 
	        FROM information_schema.columns 
	        WHERE table_schema = 'inventory_smart' 
	        AND table_name = $1 
	        AND column_name = _column;
	
	        -- Check if column is inside hierarchy JSON

            IF EXISTS (
                SELECT 1
                FROM jsonb_each_text(
                    (SELECT hierarchy FROM inventory_smart.dc_service_levels LIMIT 1)
                ) AS h(key, value)
                WHERE key = _column
            ) THEN
                -- Inside JSONB hierarchy
                _con := array_append(_con, 
                    '(hierarchy->>''' || _column || '''::' || _dt || ' ILIKE ''%' || _pattern || '%'')');
            ELSE
                -- Actual table column
                _con := array_append(_con, 
                    '(' || _column || '::' || _dt || ' ILIKE ''%' || _pattern || '%'')');
            END IF;
	    END LOOP;
	END IF;

    -- Step 3: Combine conditions
    IF cardinality(_con) > 0 THEN
        _where := ' WHERE ' || array_to_string(_con, ' ' || _query_type || ' ', '');
    END IF;

    RAISE NOTICE 'Generated WHERE clause: %', _where;
    RETURN _where;
END;
$function$
;
