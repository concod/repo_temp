--liquibase formatted sql
--changeset liquibase:dc_service_level_rule_list runOnChange:true stripComments:false splitStatements:false context:MTP-93869 labels:MTP-93869
--comment: SP to get list DC transfer service levels table data. Added missing safety_stock_wos columns. Updated SP to handle search of hierarchy columns. Resolve ambiguous column error by aliasing duplicate 'dc' fields in SQL query. Fixed sorting issues by validating sort columns, logging invalid entries, and adding default ORDER BY id ASC. Added offset.
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.dc_service_level_rule_list(refcursor, jsonb, jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.dc_service_level_rule_list(refcursor, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
DECLARE 
    _query_part TEXT;
    _query_combine TEXT;
    _where TEXT := '';
    _query_meta_filters TEXT;
    _query_meta_filters_hierarchy TEXT := ' WHERE true';
    _hash_cols TEXT;
    _rcl_codes INTEGER[];
    _pa_query TEXT := '';
    v_gen_random_uuid TEXT := gen_random_uuid()::VARCHAR;
    _hierarchy_cols TEXT[];
    _meta_json JSONB := $3;
    _product_attributes_filter JSONB := $2;
    _normal_meta_json JSONB := '{}'::JSONB;
    _search_item JSONB;
    _column TEXT;
    _pattern TEXT;
    _search_type TEXT;
    _type TEXT;
    _cast_columns TEXT[];
    _order_clause TEXT := '';
    _limit INTEGER;
    _offset INTEGER;
BEGIN
    -- Get hierarchy column names
    SELECT ARRAY_AGG(DISTINCT key_name)
    INTO _hierarchy_cols
    FROM inventory_smart.dc_service_levels,
         LATERAL jsonb_object_keys("hierarchy") AS key_name;

    RAISE NOTICE '_hierarchy_cols: %', _hierarchy_cols;

    _where := inventory_smart.form_dc_dc_transfer_table_filters('dc_service_levels', _product_attributes_filter, NULL);
    RAISE NOTICE '_where: %', _where;

    -- Prepare hierarchy filters and filter normal meta JSON
    IF _meta_json IS NOT NULL AND jsonb_typeof(_meta_json) = 'object' THEN
        _normal_meta_json := _meta_json;

        IF _meta_json->>'search' IS NOT NULL THEN
            FOR i IN 0 .. jsonb_array_length(_meta_json->'search') - 1 LOOP
                _search_item := _meta_json->'search'->i;
                _column := _search_item->>'column';
                _pattern := _search_item->>'pattern';
                _search_type := _search_item->>'search_type';
                _type := _search_item->>'type';

                IF _column = ANY(_hierarchy_cols) THEN
                    -- Handle hierarchy column filtering
                    IF _search_type = 'contains' THEN
                        _query_meta_filters_hierarchy := _query_meta_filters_hierarchy || 
                            FORMAT(' AND hierarchy->>''%s'' ILIKE ''%%%s%%''', 
                                  _column, REPLACE(_pattern, '''', ''''''));
                    ELSE 
                        _query_meta_filters_hierarchy := _query_meta_filters_hierarchy || 
                            FORMAT(' AND hierarchy->>''%s'' = ''%s''', 
                                  _column, REPLACE(_pattern, '''', ''''''));
                    END IF;
                ELSIF _type = 'str' THEN
                    _cast_columns := ARRAY_APPEND(_cast_columns, _column);
                END IF;
            END LOOP;

            _normal_meta_json := jsonb_build_object(
                'sort', _meta_json->'sort',
                'limit', _meta_json->'limit',
                'range', _meta_json->'range',
                'search', (
                    SELECT jsonb_agg(item)
                    FROM jsonb_array_elements(_meta_json->'search') AS item
                    WHERE NOT (item->>'column' = ANY(_hierarchy_cols))
                ),
                'query_type', _meta_json->'query_type'
            );
        END IF;

        -- Prepare ORDER BY clause
        IF _meta_json->>'sort' IS NOT NULL AND jsonb_array_length(_meta_json->'sort') > 0 THEN
            _order_clause := ' ORDER BY ';
            FOR i IN 0 .. jsonb_array_length(_meta_json->'sort') - 1 LOOP
                _search_item := _meta_json->'sort'->i;
                _column := _search_item->>'column';
                _pattern := UPPER(_search_item->>'order');

                -- Validate that column is not empty
                IF _column IS NULL OR _column = '' THEN
                    RAISE NOTICE 'Skipping invalid sort column at index %', i;
                    CONTINUE;
                END IF;

                IF i > 0 THEN
                    _order_clause := _order_clause || ', ';
                END IF;

                IF _column = ANY(_hierarchy_cols) THEN
                    _order_clause := _order_clause || FORMAT('hierarchy->>''%s'' %s', _column, _pattern);
                ELSE
                    _order_clause := _order_clause || FORMAT('%I %s', _column, _pattern);
                END IF;
            END LOOP;

            -- If no valid columns were added, reset _order_clause
            IF _order_clause = ' ORDER BY ' THEN
                _order_clause := '';
            END IF;

            -- Remove sort from _normal_meta_json to prevent form_table_query from adding another ORDER BY
            _normal_meta_json := _normal_meta_json - 'sort';
        END IF;

        -- Apply default ORDER BY if no sort is provided
        IF _order_clause = '' THEN
            _order_clause := ' ORDER BY id ASC'; -- Optional: Remove or modify if a different default is preferred
        END IF;

        -- Extract limit and offset for use in _query_combine
        _limit := COALESCE((_meta_json->'limit'->>'limit')::INT, 100);
		_offset := ((_meta_json->'limit'->>'page')::int - 1) * (_meta_json->'limit'->>'limit')::int;

        -- Remove limit from _normal_meta_json to prevent form_table_query from adding LIMIT/OFFSET
        _normal_meta_json := _normal_meta_json - 'limit';

        IF _query_meta_filters_hierarchy = ' WHERE true' THEN
            _query_meta_filters_hierarchy := '';
        END IF;
    END IF;

    _query_meta_filters := inventory_smart.form_table_query(_normal_meta_json);
    _query_meta_filters := REGEXP_REPLACE(_query_meta_filters, '\bWHERE\s+(?=LIMIT)', '', 'g');
    _query_meta_filters := REGEXP_REPLACE(_query_meta_filters, '\s*LIMIT\s+\d+\s*OFFSET\s+\d+\s*;', '', 'g');

    RAISE NOTICE '_query_meta_filters: %', _query_meta_filters;

    -- Apply text casting
    IF ARRAY_LENGTH(_cast_columns, 1) > 0 THEN
        FOR i IN 1 .. ARRAY_LENGTH(_cast_columns, 1) LOOP
            _query_meta_filters := REGEXP_REPLACE(
                _query_meta_filters,
                FORMAT('(%s\s+ILIKE)', _cast_columns[i]),
                FORMAT('%s::text ILIKE', _cast_columns[i])
            );
        END LOOP;
    END IF;

    RAISE NOTICE '_query_meta_filters_hierarchy: %', _query_meta_filters_hierarchy;
    RAISE NOTICE '_query_meta_filters: %', _query_meta_filters;

    -- Combine everything
    _query_combine := '
    SELECT A.*
    FROM (
        SELECT c.id, c.hierarchy,
            c.dc as dc_code,
            dc.linked_store_code as dc,
            c.target_wos,
            c.min_stock,
            c.safety_stock_method,
            c.safety_stock_units,
            c.service_level_percentage,
            c.safety_stock_wos,
            u1.email as created_by,
            c.created_at,
            u2.email as updated_by,
            c.updated_at
        FROM "inventory_smart".dc_service_levels c 
        JOIN global.distribution_centres dc ON c.dc = dc.dc_code
        LEFT JOIN global.user_master u1 ON u1.user_code = c.created_by
        LEFT JOIN global.user_master u2 ON u2.user_code = c.updated_by
        ' || _where || '
    ) as A
    ' || 
    CASE 
        WHEN _query_meta_filters_hierarchy IS NOT NULL AND _query_meta_filters_hierarchy <> '' THEN 
            _query_meta_filters_hierarchy || 
            CASE WHEN _query_meta_filters != '' THEN REGEXP_REPLACE(_query_meta_filters, '^\s*WHERE\s+', ' AND ') ELSE '' END
        ELSE 
            _query_meta_filters
    END ||
    _order_clause ||
    FORMAT(' LIMIT %s OFFSET %s', _limit, _offset) || ';';

    RAISE NOTICE 'query_combine: %', _query_combine;

    OPEN $1 FOR EXECUTE _query_combine;

    PERFORM global.sp_log(
        v_gen_random_uuid, 
        'inventory_smart.dc_service_level_rule_list', 
        'Before Return',
        _query_combine,
        jsonb_build_object('product_filter', $2, 'meta_filters', $3)
    );    
    RETURN $1;
END
$function$;