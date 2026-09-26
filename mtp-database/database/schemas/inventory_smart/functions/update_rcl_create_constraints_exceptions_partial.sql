--liquibase formatted sql
--changeset shashwat.yadav:update_rcl_create_constraints_exceptions_partial_new_change runOnChange:true stripComments:false splitStatements:false context:Release_4 labels:liquibase_project_start
--comment: initial changeset for update_rcl_create_constraints_exceptions_partial_new_change
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.update_rcl_create_constraints_exceptions_partial(_persisted_temp_tbl_name text, _select jsonb, _value text, _search_meta jsonb, _created_by integer, _is_all_records_selected boolean, _excluded_rows jsonb,_is_wos_incremented boolean);
CREATE OR REPLACE FUNCTION inventory_smart.update_rcl_create_constraints_exceptions_partial(_persisted_temp_tbl_name text, _select jsonb, _value text, _search_meta jsonb, _created_by integer, _is_all_records_selected boolean, _excluded_rows jsonb, _is_wos_incremented boolean)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    _set jsonb;
    _temp_sql varchar;
    _where text := '';
    _key text;
    _value text;
    _con varchar[];
    _final varchar[];
    _dt_sql text;
    _dt text;
    _recordset varchar[];
    _value_record jsonb;
    _ex_cols_sql text;
    _ex_cols text[];
    _valueset text[];
    _temp_table text := gen_random_uuid();
    _temp_table_2 text := gen_random_uuid();
    _query_meta_filters text;
    _set_value text;
    _wos_increment_value numeric := null;
    _wos_regex text := 'wos\s*=\s*([+-]?\d+(?:\.\d+)?)';
    _dos_regex text := 'dos\s*=\s*([+-]?\d+(?:\.\d+)?)';
    _wos_matches text[];
	_wos_assignment  text;
	d_temp_sql text;
    /*
    Description: Inputs: $1 = persistent temp table name, $2 = jsonb array of set all, selections filters, $3 = new values for the filters, $4 = meta filters, $5 = created by, $6 = is_wos_incremented.
    This function is an intermediate one to update the persistent temp table with the user selected values. first need to create temp table by calling inventory_smart.rcl_create_constraints_exception function.
    sample call: select * from inventory_smart.update_rcl_create_constraints_exceptions('rule_store_groups_temp1', '[{"rule_code":2, "store_code":10005347}, {"rule_code":3, "store_code":138800005}]', '[{"start_date":"2024-09-01", "end_date":"2024-10-31"}]', '{}', 99);
    first need to create temp table by calling global.rcl_create_constraints_exceptions function*/
BEGIN
    _query_meta_filters := inventory_smart.form_rcl_table_query(_search_meta);
    IF jsonb_array_length($2) > 0 THEN
        FOR _set IN SELECT * FROM jsonb_array_elements($2) LOOP
            FOR _key, _value IN SELECT * FROM jsonb_each_text(_set) LOOP 
                IF _key = 'store_code' or _key = 'psa_code' THEN 
                    _con := array_append(_con,  _key || ' = ' || quote_literal(_value));
                ELSE
                    _con := array_append(_con,  _key || ' = ' || _value);
                    RAISE NOTICE '_con: %', _con;
                END IF;
            END LOOP;
            _final := array_append(_final, '(' || array_to_string(_con, ' AND ') ||')');
            _con := '{}';
        END LOOP;
       
        IF cardinality(_final) > 0 THEN
            _where := ' WHERE ' || array_to_string(_final, ' OR ');
        END IF;
        RAISE NOTICE 'where: %', _where;
        
        _temp_sql := 'CREATE TEMP TABLE "' || _temp_table || '" on commit drop AS SELECT rule_code, store_code FROM public.'  || $1 || _where || ';';
        RAISE NOTICE '_temp_sql: %', _temp_sql;
        EXECUTE _temp_sql;
           
    ELSE
        _temp_sql := 'CREATE TEMP TABLE "' || _temp_table || '" on commit drop AS SELECT rule_code, store_code FROM public.'  || $1 || _query_meta_filters || ';';
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

	_set_value := $3;
	
	-- Extract and remove wos from the set string
	IF position('wos' in _set_value) > 0 THEN
	    BEGIN
	        -- Extract the WOS value using regex
	        SELECT regexp_matches(_set_value, _wos_regex) INTO _wos_matches;
	        IF _wos_matches IS NOT NULL AND array_length(_wos_matches, 1) > 0 THEN
	            _wos_increment_value := _wos_matches[1]::numeric;
	            RAISE NOTICE 'WOS increment value: %', _wos_increment_value;

                -- Remove any existing assignment to wos (handles all positions and whitespace, including leading/trailing commas)
                _set_value := regexp_replace(_set_value, '(,\s*)?wos\s*=\s*[^,]+(\s*,)?', '', 'gi');
	            -- Normalize double commas and leading/trailing commas
                _set_value := regexp_replace(_set_value, ',\s*,', ',', 'g');
                _set_value := regexp_replace(_set_value, 'set\s*,', 'set ', 'gi');
                _set_value := regexp_replace(_set_value, ',\s*$', '', 'g');
                _set_value := regexp_replace(_set_value, '^\s*,', '', 'g');
                _set_value := trim(_set_value);
                RAISE NOTICE 'After normalization: %', _set_value;

                -- Ensure all assignments are separated by commas (improved regex)
                _set_value := regexp_replace(_set_value, '(\w+\s*=\s*[^,=]+?)\s+(\w+\s*=)', '\1, \2', 'g');
                _set_value := regexp_replace(_set_value, '(\w+\s*=\s*[^,=]+?)\s+(\w+\s*=)', '\1, \2', 'g');

                -- Build WOS assignment
                IF _is_wos_incremented THEN
                    _wos_assignment := 'wos = LEAST(52, GREATEST(1, COALESCE(wos, 0) + ' || _wos_increment_value || '))';
                ELSE
                    _wos_assignment := 'wos = ' || _wos_increment_value;
                END IF;
	
                -- Now append the WOS assignment in the right place
                IF trim(_set_value) = 'set' THEN
                    _set_value := 'set ' || _wos_assignment;
                ELSIF _set_value ~* '^set\\b' THEN
                    _set_value := trim(both ', ' from _set_value);
                    _set_value := _set_value || ', ' || _wos_assignment;
                ELSIF _set_value = '' THEN
                    _set_value := _wos_assignment;
                ELSE
                    _set_value := trim(both ', ' from _set_value);
                    _set_value := _set_value || ', ' || _wos_assignment;
                END IF;
                RAISE NOTICE 'inside_wos_set_value: %', _set_value;
	        END IF;	
	    EXCEPTION WHEN OTHERS THEN
	        RAISE EXCEPTION 'Error extracting wos: %', SQLERRM;
	    END;
	ELSIF position('dos' in _set_value) > 0 THEN
	    BEGIN
	        -- Extract the DOS value using regex
	        SELECT regexp_matches(_set_value, _dos_regex) INTO _wos_matches;
	        IF _wos_matches IS NOT NULL AND array_length(_wos_matches, 1) > 0 THEN
	            _wos_increment_value := _wos_matches[1]::numeric;
	            RAISE NOTICE 'DOS increment value: %', _wos_increment_value;

                -- Remove any existing assignment to dos (handles all positions and whitespace, including leading/trailing commas)
                _set_value := regexp_replace(_set_value, '(,\s*)?dos\s*=\s*[^,]+(\s*,)?', '', 'gi');
	            -- Normalize double commas and leading/trailing commas
                _set_value := regexp_replace(_set_value, ',\s*,', ',', 'g');
                _set_value := regexp_replace(_set_value, 'set\s*,', 'set ', 'gi');
                _set_value := regexp_replace(_set_value, ',\s*$', '', 'g');
                _set_value := regexp_replace(_set_value, '^\s*,', '', 'g');
                _set_value := trim(_set_value);
                RAISE NOTICE 'After normalization: %', _set_value;

                -- Ensure all assignments are separated by commas (improved regex)
                _set_value := regexp_replace(_set_value, '(\w+\s*=\s*[^,=]+?)\s+(\w+\s*=)', '\1, \2', 'g');
                _set_value := regexp_replace(_set_value, '(\w+\s*=\s*[^,=]+?)\s+(\w+\s*=)', '\1, \2', 'g');

                -- Build DOS assignment
                IF _is_wos_incremented THEN
                    _wos_assignment := 'dos = GREATEST(1, COALESCE(dos, 0) + ' || _wos_increment_value || ')';
                ELSE
                    _wos_assignment := 'dos = ' || _wos_increment_value;
                END IF;
	
                -- Now append the DOS assignment in the right place
                IF trim(_set_value) = 'set' THEN
                    _set_value := 'set ' || _wos_assignment;
                ELSIF _set_value ~* '^set\\b' THEN
                    _set_value := trim(both ', ' from _set_value);
                    _set_value := _set_value || ', ' || _wos_assignment;
                ELSIF _set_value = '' THEN
                    _set_value := _wos_assignment;
                ELSE
                    _set_value := trim(both ', ' from _set_value);
                    _set_value := _set_value || ', ' || _wos_assignment;
                END IF;
                RAISE NOTICE 'inside_dos_set_value: %', _set_value;
	        END IF;	
	    EXCEPTION WHEN OTHERS THEN
	        RAISE EXCEPTION 'Error extracting dos: %', SQLERRM;
	    END;
	END IF;
	
	-- Wrap exception_rule_name value in quotes (improved regex)
	_set_value := regexp_replace(_set_value, 
	            'exception_rule_name\s*=\s*([^,]+?)(?=\s*,|\s*\w+\s*=|\s*$)', 
	            'exception_rule_name = E''\1''', 
	            'g');

	_set_value := regexp_replace(_set_value, '(\w+\s*=\s*[^,\s]+(?:\s+[^,\s]+)*?)\s+(?=\w+\s*=)', '\1, ', 'g');
	RAISE NOTICE '_set_value: %', _set_value;
    _temp_sql := 'UPDATE public.'  || $1 || ' ' || _set_value || ', created_by = ' || $5 || ', created_at = now() where (rule_code, store_code) IN (SELECT rule_code, store_code FROM "' ||_temp_table || '");';
	RAISE NOTICE '_temp_sql: %', _temp_sql;
    EXECUTE _temp_sql;
END;
$function$
;