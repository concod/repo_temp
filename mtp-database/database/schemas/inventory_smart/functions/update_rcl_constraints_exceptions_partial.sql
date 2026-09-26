--liquibase formatted sql
--changeset shashwat.yadav:update_rcl_constraints_exceptions_partial_new_change runOnChange:true stripComments:false splitStatements:false context:Release_5 labels:liquibase_project_start
--comment: initial changeset for update_rcl_constraints_exceptions_partial_new_change
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.update_rcl_constraints_exceptions_partial(_selections jsonb, _product_filters jsonb, _store_filters jsonb, _values text, _meta_filters jsonb, _updated_by int4, _is_all_records_selected boolean, _excluded_rows jsonb, _is_wos_incremented boolean);
CREATE OR REPLACE FUNCTION inventory_smart.update_rcl_constraints_exceptions_partial(_selections jsonb, _product_filters jsonb, _store_filters jsonb, _values text, _meta_filters jsonb, _updated_by integer, _is_all_records_selected boolean, _excluded_rows jsonb, _is_wos_incremented boolean)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare 
--_query_part text;
_query_combine text;
_where text := '';
_final varchar[];
_query_meta_filters text;
_query_sa text;
_pa_query text;
_hash_cols text;
_rcl_codes integer[];
_dimension text[];
_item jsonb;
_key text;
_value text;
_con text[];
_key_cols text;
_dt_sql text;
_dt text;
_set jsonb;
_sets text;
_temp_sql text;
_set_value text;
_query_final text := '';
_temp_table text := gen_random_uuid();
_temp_table_2 text := gen_random_uuid();
_update_values text;
_wos_increment_value numeric := null;
_wos_regex text := 'wos\s*=\s*([+-]?\d+(?:\.\d+)?)';
_dos_regex text := 'dos\s*=\s*([+-]?\d+(?:\.\d+)?)';
_wos_matches text[];
_wos_assignment text;
d_temp_sql text;
/*s
Description: Inputs: $1 = set all/ selections values, $2 = product filters, $3 = store filters, $4 = new values for the filters, $5 = meta filters, $6 = created by, $7 = is_wos_incremented.
This sp is used to update the base table directly. 
ample call: select * from inventory_smart.update_rcl_constraints_exceptions('[{}]', '{
    "l0_name": [{
            "type": "list",
            "operator": "in",
            "values": [
                "33-M CLOTHING"
            ]
        }],
    "l1_name": [
        {
            "type": "list",
            "operator": "in",
            "values": [
                "33-M CLOTHING"
            ]
        }
    ],
    "color": [],
    "size": [],
    "l4_name": [],
    "article": [],
    "l3_name": [],
    "l2_name": []
}'::jsonb, '[
    {
        "st": 2323,
        "wos": 82323,
        "min_stock": 0,
        "max_stock": 0,
		"start_date": "2024-05-05",
		"end_date": "2025-05-05"
    }
]'::jsonb, '{"search": [], "range": [], "query_type": "AND"}', 1, false);
*/
begin
    _query_meta_filters := inventory_smart.form_rcl_table_query(_meta_filters);
	_pa_query := global.form_main_table_filters('product_attributes_filter', $2);
	select
		array_agg(rcl_code),
		'array[' || string_agg('rcl_hash->>' || quote_literal(rcl_code), ', ') || ']::text[] as rcl_hash' into _rcl_codes, _hash_cols 
	from global.rcl_master 
	where not is_deleted
	and module_code = '170'
	group by is_deleted;
    _query_sa := global.form_main_table_filters('store_attributes_filter', _store_filters);

    _update_values := $4;
    
    -- Debug: Print initial update values
    RAISE NOTICE 'Initial _update_values: %', _update_values;
    
    -- Extract and remove wos from the update string
    IF position('wos' in _update_values) > 0 THEN
        BEGIN
            -- Extract the WOS value using regex
            SELECT regexp_matches(_update_values, _wos_regex) INTO _wos_matches;
            IF _wos_matches IS NOT NULL AND array_length(_wos_matches, 1) > 0 THEN
                _wos_increment_value := _wos_matches[1]::numeric;
                RAISE NOTICE 'WOS increment value: %', _wos_increment_value;

                -- Remove any existing assignment to wos (handles all positions and whitespace, including leading/trailing commas)
                -- Use a more precise regex that only removes the wos assignment without affecting other commas
                _update_values := regexp_replace(_update_values, 'wos\s*=\s*[^,]+', '', 'gi');
                _update_values := regexp_replace(_update_values, ',\s*,', ',', 'g');
                _update_values := regexp_replace(_update_values, '^\s*set\s*,\s*', 'set ', 'i');
                _update_values := regexp_replace(_update_values, ',\s*$', '', 'g');
                _update_values := regexp_replace(_update_values, '^\s*,', '', 'g');
                RAISE NOTICE 'After leading comma cleanup: %', _update_values;
                _update_values := trim(_update_values);
                RAISE NOTICE 'After normalization: %', _update_values;

                -- Build WOS assignment
                IF _is_wos_incremented THEN
                    _wos_assignment := 'wos = LEAST(52, GREATEST(1, COALESCE(wos, 0) + ' || _wos_increment_value || '))';
                ELSE
                    _wos_assignment := 'wos = ' || _wos_increment_value;
                END IF;
                RAISE NOTICE 'WOS assignment: %', _wos_assignment;

                -- Now append the WOS assignment in the right place
                IF trim(_update_values) = 'set' THEN
                    _update_values := 'set ' || _wos_assignment;
                ELSIF _update_values ~* '^set\\b' THEN
                    _update_values := trim(both ', ' from _update_values);
                    _update_values := _update_values || ', ' || _wos_assignment;
                ELSIF _update_values = '' THEN
                    _update_values := _wos_assignment;
                ELSE
                    _update_values := trim(both ', ' from _update_values);
                    _update_values := _update_values || ', ' || _wos_assignment;
                END IF;
                RAISE NOTICE 'Final _update_values after WOS processing: %', _update_values;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE EXCEPTION 'Error extracting wos: %', SQLERRM;
        END;
    -- Extract and remove dos from the update string
    ELSIF position('dos' in _update_values) > 0 THEN
        BEGIN
            -- Extract the DOS value using regex
            SELECT regexp_matches(_update_values, _dos_regex) INTO _wos_matches;
            IF _wos_matches IS NOT NULL AND array_length(_wos_matches, 1) > 0 THEN
                _wos_increment_value := _wos_matches[1]::numeric;
                RAISE NOTICE 'DOS increment value: %', _wos_increment_value;

                -- Remove any existing assignment to wos (handles all positions and whitespace, including leading/trailing commas)
                -- Use a more precise regex that only removes the wos assignment without affecting other commas
                _update_values := regexp_replace(_update_values, 'dos\s*=\s*[^,]+', '', 'gi');
                _update_values := regexp_replace(_update_values, ',\s*,', ',', 'g');
                _update_values := regexp_replace(_update_values, '^\s*set\s*,\s*', 'set ', 'i');
                _update_values := regexp_replace(_update_values, ',\s*$', '', 'g');
                _update_values := regexp_replace(_update_values, '^\s*,', '', 'g');
                RAISE NOTICE 'After leading comma cleanup: %', _update_values;
                _update_values := trim(_update_values);
                RAISE NOTICE 'After normalization: %', _update_values;

                -- Build DOS assignment
                IF _is_wos_incremented THEN
                    _wos_assignment := 'dos = GREATEST(1, COALESCE(dos, 0) + ' || _wos_increment_value || ')';
                ELSE
                    _wos_assignment := 'dos = ' || _wos_increment_value;
                END IF;
                RAISE NOTICE 'DOS assignment: %', _wos_assignment;

                -- Now append the DOS assignment in the right place
                IF trim(_update_values) = 'set' THEN
                    _update_values := 'set ' || _wos_assignment;
                ELSIF _update_values ~* '^set\\b' THEN
                    _update_values := trim(both ', ' from _update_values);
                    _update_values := _update_values || ', ' || _wos_assignment;
                ELSIF _update_values = '' THEN
                    _update_values := _wos_assignment;
                ELSE
                    _update_values := trim(both ', ' from _update_values);
                    _update_values := _update_values || ', ' || _wos_assignment;
                END IF;
                RAISE NOTICE 'Final _update_values after DOS processing: %', _update_values;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE EXCEPTION 'Error extracting Dos: %', SQLERRM;
        END;
    END IF;

    -- Parse and fix exception_rule_name assignment more robustly
    IF position('exception_rule_name' in _update_values) > 0 THEN
        -- Use a simpler approach: find the start and end of exception_rule_name assignment
        _set_value := regexp_replace(_update_values, 
            'exception_rule_name\s*=\s*([^,]+?)(?=\s*,|\s*$)', 
            'exception_rule_name = E''\1''', 
            'g');
    ELSE
        _set_value := _update_values;
    END IF;
    
    -- Debug: Print the result after regex replacement
    RAISE NOTICE 'After regex replacement _set_value: %', _set_value;

IF jsonb_array_length(_selections) > 0 THEN
    FOR _set IN SELECT * FROM jsonb_array_elements($1) LOOP
        FOR _key, _value IN SELECT * FROM jsonb_each_text(_set) LOOP 
            IF _key IN ('store_code', 'psa_code', 'psa_name') THEN 
                _con := array_append(_con, _key || ' = ' || quote_literal(_value));
            ELSE
                _con := array_append(_con, _key || ' = ' || _value);
                RAISE NOTICE '_con: %', _con;
            END IF;
        END LOOP;
        _final := array_append(_final, '(' || array_to_string(_con, ' AND ') || ')');
        _con := '{}';
    END LOOP;
    
    IF cardinality(_final) > 0 THEN
        _where := ' WHERE ' || array_to_string(_final, ' OR ');
    END IF;
    RAISE NOTICE 'where: %', _where;
    
    _temp_sql := 'CREATE TEMP TABLE "' || _temp_table || '" ON COMMIT DROP AS SELECT x.rule_code, x.store_code FROM (SELECT rule_code, store_code FROM inventory_smart.rcl_constraint_master_exceptions' || _where || ') x JOIN (SELECT * from global.store_attributes_filter ' || case when nullif(_query_sa, '') is null then ' where ' else _query_sa || ' and ' end || 'active) s USING (store_code);';
    RAISE NOTICE '_temp_sql: %', _temp_sql;
    EXECUTE _temp_sql;

ELSE 
    _where := ' JOIN (
        with paf_cte as materialized (SELECT ' || _hash_cols || ' FROM global.product_attributes_filter ' || _pa_query || ' and active GROUP BY 1)
        SELECT rcl_code, rule_code, md5(r.rcl_dimension::text) rcl_hash, rcl_dimension, rule_name FROM inventory_smart.rcl_constraint_master_rule r JOIN paf_cte
        ON md5(r.rcl_dimension::text) = ANY(rcl_hash) AND r.rcl_code = ANY(' || quote_literal(_rcl_codes::text) || '::int[]) 
        GROUP BY 1, 2, 3, 4, 5) r on r.rule_code = c.rule_code and r.rcl_code = c.rcl_code ';
    
    _temp_sql := 'CREATE TEMP TABLE "' || _temp_table || '" ON COMMIT DROP AS SELECT x.rule_code, x.store_code FROM (SELECT c.rule_code, r.rcl_dimension, c.store_code FROM inventory_smart.rcl_constraint_master_exceptions c' || _where ||') x JOIN (SELECT * from global.store_attributes_filter ' || case when nullif(_query_sa, '') is null then ' where ' else _query_sa || ' and ' end || ' active) s USING (store_code) ' ||  _query_meta_filters || ';';
    RAISE NOTICE '_temp_sql: %', _temp_sql;
    EXECUTE _temp_sql;
    if _is_all_records_selected and jsonb_array_length(_excluded_rows) > 0 then
        d_temp_sql := format('
            delete from "%s" 
            where (rule_code, store_code) in (
                select (value->>''rule_code'')::integer as rule_code,
                        (value->>''store_code'')::varchar as store_code
                from jsonb_array_elements(%L::jsonb) as value
            )', _temp_table, _excluded_rows);
        execute d_temp_sql;
    end if;
END IF;

    _temp_sql := 'UPDATE inventory_smart.rcl_constraint_master_exceptions ' || _set_value || ' , updated_by = ' || $6 ||', updated_at = now() where (rule_code, store_code) IN (SELECT rule_code, store_code FROM "' ||_temp_table || '");';
    EXECUTE _temp_sql;
end
$function$
;