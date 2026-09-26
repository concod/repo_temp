--liquibase formatted sql
--changeset liquibase:dc_service_level_rule_list runOnChange:true stripComments:false splitStatements:false context:MTP-74329 labels:MTP-74329
--comment: SP to get list DC transfer service levels table data. Added missing safety_stock_wos columns. Updated SP to handle search of hierarchy columns
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.dc_service_level_rule_list(refcursor, jsonb, jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.dc_service_level_rule_list(refcursor, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare 
    _query_part text;
    _query_combine text;
    _where text := '';
    _query_meta_filters text;
    _query_meta_filters_hierarchy text := '';
    _hash_cols text;
    _rcl_codes integer[];
    _pa_query text := '';
    v_gen_random_uuid text := gen_random_uuid()::varchar;
    _hierarchy_cols text[];
    _meta_json jsonb := $3;
    _normal_meta_json jsonb := '{}'::jsonb;
    _search_item jsonb;
    _column text;
    _pattern text;
    _search_type text;
    _type text;
    _cast_columns text[];

begin
    -- Get hierarchy column names
    SELECT array_agg(DISTINCT key_name)
    INTO _hierarchy_cols
    FROM inventory_smart.dc_service_levels,
         LATERAL jsonb_object_keys("hierarchy") AS key_name;

    raise notice '_hierarchy_cols: %', _hierarchy_cols;

    _where := inventory_smart.form_dc_dc_transfer_table_filters('dc_service_levels', $2);
    raise notice '_where: %', _where;

    -- Prepare hierarchy filters and filter normal meta JSON
    IF _meta_json IS NOT NULL AND jsonb_typeof(_meta_json) = 'object' THEN
        _query_meta_filters_hierarchy := ' WHERE true';
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
                            format(' AND hierarchy->>''%s'' ILIKE ''%%%s%%''', 
                                  _column, replace(_pattern, '''', ''''''));
                    ELSE 
                        _query_meta_filters_hierarchy := _query_meta_filters_hierarchy || 
                            format(' AND hierarchy->>''%s'' = ''%s''', 
                                  _column, replace(_pattern, '''', ''''''));
                    END IF;
                ELSEIF _type = 'str' THEN
                    _cast_columns := array_append(_cast_columns, _column);
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

        IF _query_meta_filters_hierarchy = ' WHERE true' THEN
            _query_meta_filters_hierarchy := '';
        END IF;
    END IF;

    _query_meta_filters := inventory_smart.form_table_query(_normal_meta_json);
	_query_meta_filters := REGEXP_REPLACE(_query_meta_filters, '\bWHERE\s+(?=LIMIT)', '', 'g');

    raise notice '_query_meta_filters: %', _query_meta_filters;

    -- Apply text casting
    IF array_length(_cast_columns, 1) > 0 THEN
        FOR i IN 1 .. array_length(_cast_columns, 1) LOOP
            _query_meta_filters := regexp_replace(
                _query_meta_filters,
                format('(%s\s+ILIKE)', _cast_columns[i]),
                format('%s::text ILIKE', _cast_columns[i])
            );
        END LOOP;
    END IF;

	raise notice '_query_meta_filters_hierarchy: %', _query_meta_filters_hierarchy;
	raise notice '_query_meta_filters: %', _query_meta_filters;

    _query_combine := '
    SELECT A.*
    FROM (
        SELECT c.id, c.hierarchy,
            c.dc,
            dc.linked_store_code as dc,
            c.target_wos,
            c.min_stock,
            c.safety_stock_method,
            c.safety_stock_units,
            c.service_level_percentage,
            c.safety_stock_wos,
            email as created_by,
            c.created_at,
            email as updated_by,
            c.updated_at
        FROM "inventory_smart".dc_service_levels c 
		join global.distribution_centres dc on c.dc = dc.dc_code
		left join global.user_master u on u.user_code = coalesce(c.updated_by, c.created_by)
        ' || _where || '
    ) as A
    ' || CASE 
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