--liquibase formatted sql
--changeset liquibase:dc_transfer_rule_list_constraint runOnChange:true stripComments:false splitStatements:false context:MTP-74329 labels:MTP-74329
--comment: SP to get list DC transfer service levels table data, Updated SP to handle search of hierarchy columns
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.dc_transfer_rule_list_constraint(refcursor, jsonb, jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.dc_transfer_rule_list_constraint(refcursor, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare 
    _query_part text;
    _query_combine text;
    _where text := '';
    _query_meta_filters text;           -- For normal columns
    _query_meta_filters_hierarchy text := '';  -- For hierarchy columns
    _hash_cols text;
    _rcl_codes integer[];
    _pa_query text := '';
    v_gen_random_uuid text := gen_random_uuid()::varchar;
    _hierarchy_cols text[];            -- Array to store hierarchy column names
    _meta_json jsonb := $3;            -- Alias for meta filters parameter
    _normal_meta_json jsonb := '{}'::jsonb;  -- JSONB for non-hierarchy filters
    _search_item jsonb;                -- For iterating over search array
    _column text;                      -- Column name from search item
    _pattern text;                     -- Pattern from search item
    _search_type text;                 -- Search type from search item
    _type text;                        -- Type from search item
    _cast_columns text[];              -- Array to store columns needing text cast
	search_list jsonb;
	sort_list jsonb;

begin
    -- Get hierarchy column names from dc_transfer_constraints using a subquery
    SELECT array_agg(DISTINCT key_name)
    INTO _hierarchy_cols
    FROM inventory_smart.dc_transfer_constraints,
         LATERAL jsonb_object_keys("hierarchy") AS key_name;

    raise notice '_hierarchy_cols: %', _hierarchy_cols;

    _where := inventory_smart.form_dc_dc_transfer_table_filters('dc_transfer_constraints', $2);
    raise notice '_where: %', _where;

    raise notice '_meta_json: %', _meta_json;

    -- Prepare hierarchy filters and build filtered JSON for normal filters
    IF _meta_json IS NOT NULL AND jsonb_typeof(_meta_json) = 'object' THEN
        _query_meta_filters_hierarchy := ' WHERE true';
        _normal_meta_json := _meta_json;  -- Start with full meta_json
        
        -- Process the search array if it exists
        IF _meta_json->>'search' IS NOT NULL THEN
            FOR i IN 0 .. jsonb_array_length(_meta_json->'search') - 1 LOOP
                _search_item := _meta_json->'search'->i;
                _column := _search_item->>'column';
                _pattern := _search_item->>'pattern';
                _search_type := _search_item->>'search_type';
                _type := _search_item->>'type';

                IF _column = ANY(_hierarchy_cols) THEN
                    -- Add to hierarchy filters based on search_type
                    IF _search_type = 'contains' THEN
                        _query_meta_filters_hierarchy := _query_meta_filters_hierarchy || 
                            format(' AND hierarchy->>''%s'' ILIKE ''%%%s%%''', 
                                  _column, 
                                  replace(_pattern, '''', ''''''));
                    ELSE  -- Default to equals if search_type is unknown
                        _query_meta_filters_hierarchy := _query_meta_filters_hierarchy || 
                            format(' AND hierarchy->>''%s'' = ''%s''', 
                                  _column, 
                                  replace(_pattern, '''', ''''''));
                    END IF;
                ELSEIF _type = 'str' THEN
                    -- Collect columns that need text casting
                    _cast_columns := array_append(_cast_columns, _column);
                END IF;
            END LOOP;

            -- Remove hierarchy columns from normal_meta_json's search array
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

        -- Clean up if no hierarchy conditions were added
        IF _query_meta_filters_hierarchy = ' WHERE true' THEN
            _query_meta_filters_hierarchy := '';
        END IF;
    END IF;

    raise notice '_normal_meta_json: %', _normal_meta_json;
    raise notice '_query_meta_filters_hierarchy: %', _query_meta_filters_hierarchy;
    
    -- Get normal meta filters using filtered JSON
    _query_meta_filters := inventory_smart.form_table_query(_normal_meta_json);
	_query_meta_filters := REGEXP_REPLACE(_query_meta_filters, '\bWHERE\s+(?=LIMIT)', '', 'g');

    raise notice '_query_meta_filters: %', _query_meta_filters;

    -- Apply text casting to all columns in _cast_columns
    IF array_length(_cast_columns, 1) > 0 THEN
        FOR i IN 1 .. array_length(_cast_columns, 1) LOOP
            _query_meta_filters := regexp_replace(
                _query_meta_filters,
                format('(%s\s+ILIKE)', _cast_columns[i]),
                format('%s::text ILIKE', _cast_columns[i])
            );
        END LOOP;
    END IF;

    -- Combine hierarchy and normal filters
    _query_combine := '
    SELECT A.*
    FROM (
        SELECT c.id, c.hierarchy,
            dc1.linked_store_code as source_dc,
            dc2.linked_store_code as destination_dc,
            c.min_transfer_quantity,
            email as created_by,
            c.created_at,
            email as updated_by,
            c.updated_at
        FROM "inventory_smart".dc_transfer_constraints c 
		join global.distribution_centres dc1 on c.source_dc = dc1.dc_code
		join global.distribution_centres dc2 on c.destination_dc = dc2.dc_code
		left join global.user_master u on u.user_code = coalesce(c.updated_by, c.created_by)
        ' || _where || '
    ) as A
    '|| CASE 
            WHEN _query_meta_filters_hierarchy IS NOT NULL AND _query_meta_filters_hierarchy <> '' THEN 
                _query_meta_filters_hierarchy || 
                CASE WHEN _query_meta_filters != '' THEN regexp_replace(_query_meta_filters, '^\s*WHERE\s+', ' AND ') ELSE '' END
            ELSE 
                -- CASE WHEN _query_meta_filters != '' THEN ' WHERE ' || regexp_replace(_query_meta_filters, '^\s*WHERE\s+', '') ELSE '' END
        		_query_meta_filters
 
		END || ';';

    raise notice 'query_combine: %', _query_combine;
    OPEN $1 FOR EXECUTE _query_combine;


    PERFORM global.sp_log(
        v_gen_random_uuid, 
        'inventory_smart.rule_list_constraint', 
        'Before Return',
        _query_combine,
        jsonb_build_object('product_filter', $2, 'meta_filters', $3)
    );    
    RETURN $1;


END
$function$
;
