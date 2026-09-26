--liquibase formatted sql
--changeset shashwat.yadav:update_rcl_constraints_partial_generic runOnChange:true stripComments:false splitStatements:false context:Release_3 labels:117864
--comment: initial changeset for update_rcl_constraints_partial_generic partial
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.update_rcl_constraints_partial(_selections jsonb, _product_filters jsonb, _values text, _meta_filters jsonb, _updated_by int4, _is_all_records_selected boolean);
DROP FUNCTION IF EXISTS inventory_smart.update_rcl_constraints_partial(_selections jsonb, _product_filters jsonb, _values text, _meta_filters jsonb, _updated_by int4, _is_all_records_selected boolean, _excluded_rows jsonb);
DROP FUNCTION IF EXISTS inventory_smart.update_rcl_constraints_partial(_selections jsonb, _product_filters jsonb, _values text, _meta_filters jsonb, _updated_by int4, _is_all_records_selected boolean, _excluded_rows jsonb, _is_wos_incremented boolean);
DROP FUNCTION IF EXISTS inventory_smart.update_rcl_constraints_partial(_selections jsonb, _product_filters jsonb, _values text, _meta_filters jsonb, _updated_by int4, _is_all_records_selected boolean, _excluded_rows jsonb, _is_wos_incremented boolean, additional_data jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.update_rcl_constraints_partial(_selections jsonb, _product_filters jsonb, _values text, _meta_filters jsonb, _updated_by integer, _is_all_records_selected boolean, _excluded_rows jsonb, _is_wos_incremented boolean, additional_data jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare 
_query_part text;
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
d_temp_sql text;
_temp_table text := gen_random_uuid();
_temp_table_2 text := gen_random_uuid();
_update_values text;
_rule_name text := null;
_rule_name_regex text := 'rule_name\s*=\s*([^,]+)';
_rule_name_matches text[];
_wos_increment_value numeric := null;
_wos_regex text := 'wos\s*=\s*([+-]?\d+(?:\.\d+)?)';
_dos_regex text := 'dos\s*=\s*([+-]?\d+(?:\.\d+)?)';
_wos_matches text[];
_wos_assignment text;
_exceptions_update_values text;
additional_select_columns text;
/*
Description: Updates RCL constraints in the base table based on provided selections, filters, and update values.

Inputs:
  $1 = _selections (jsonb): Array of objects specifying rule_code and psa_code pairs to update. If empty and _is_all_records_selected is true, applies to all records matching filters except those in _excluded_rows.
  $2 = _product_filters (jsonb): Product attribute filters for selecting records.
  $3 = _values (text): Update string (e.g., 'set field1 = value1, field2 = value2'). Supports special handling for 'wos' and 'rule_name'.
  $4 = _meta_filters (jsonb): Additional meta filters for selection.
  $5 = _updated_by (integer): User ID performing the update.
  $6 = _is_all_records_selected (boolean): If true, applies update to all records matching filters except those in _excluded_rows.
  $7 = _excluded_rows (jsonb): Array of objects specifying rule_code and psa_code pairs to exclude from update when _is_all_records_selected is true.
  $8 = _is_wos_incremented (boolean, default false): If true, increments 'wos' field instead of setting it directly.

This stored procedure updates the inventory_smart.rcl_constraint_master table (and related tables for special fields) based on the provided criteria. It supports both targeted updates (via _selections) and bulk updates (via filters and _is_all_records_selected), with exclusion support.

Example call:
select * from inventory_smart.update_rcl_constraints_partial(
  '[{"rule_code":2, "psa_code":680}, {"rule_code":3, "psa_code":1143}]',
  '{}'::jsonb,
  'set min_stock = 1, max_stock = 2 , wos = 10 '
  '{}'::jsonb,
  99,
  false,
  '[]'::jsonb,
  false
);
*/
begin
    _query_meta_filters := inventory_smart.form_rcl_table_query($4);
    raise notice '1';

    additional_select_columns := coalesce($9->>'select_columns', '');
    raise notice 'additional_select_columns: %', additional_select_columns;

	_pa_query := global.form_main_table_filters('product_attributes_filter', $2);
	select
		array_agg(rcl_code),
		'array[' || string_agg('rcl_hash->>' || quote_literal(rcl_code), ', ') || ']::text[] as rcl_hashes ' into _rcl_codes, _hash_cols 
	from global.rcl_master 
	where not is_deleted
    and not is_default
	and module_code = '170'
	group by is_deleted;
--    _query_pa := replace(REPLACE(_query_pa, '(rcl_dimension->>''', ''), ''')', '');
   
   raise notice '2';

    IF jsonb_array_length($1) > 0 THEN
        FOR _set IN SELECT * FROM jsonb_array_elements($1) LOOP
            FOR _key, _value IN SELECT * FROM jsonb_each_text(_set) LOOP 
                IF _key IN ('store_code', 'psa_code') THEN 
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
        
        _temp_sql := 'CREATE TEMP TABLE "' || _temp_table || '" ON COMMIT DROP AS SELECT rule_code, psa_code FROM inventory_smart.rcl_constraint_master' ||  _where || ';';
        RAISE NOTICE '_temp_sql: %', _temp_sql;
        EXECUTE _temp_sql;
    ELSE 
        _where := ' 
        join (
            with paf as materialized(
	            select 
                    rcl_hash 
                    ' || additional_select_columns || ' 
                from (
                    select 
                        unnest(rcl_hashes) as rcl_hash 
                        ' || additional_select_columns || ' 
                    from (
                        select 
                            ' || _hash_cols || ' 
                            ' || additional_select_columns || ' 
                        from global.product_attributes_filter ' || _pa_query || ' and active) x 
                    ) y 
                where rcl_hash is not null group by 1 ' || additional_select_columns || '
            )
            select 
                rcl_code, 
                rule_code, 
                rule_name,
                md5(rcl_dimension::text) rcl_hash, 
                rcl_dimension
                ' || additional_select_columns || '
            from inventory_smart.rcl_constraint_master_rule
            join paf on rcl_hash = md5(rcl_dimension::text)
            WHERE  rcl_code = any(' || quote_literal(_rcl_codes::text) || '::int[])
            group by 1,2,3,4,5 ' || additional_select_columns || '
        ) r 
        on r.rule_code = c.rule_code and r.rcl_code = c.rcl_code ';

        -- Add the table alias to the meta filters query for both rcl_code and rule_code
        IF _query_meta_filters IS NOT NULL AND _query_meta_filters != '' THEN
            _query_meta_filters := replace(_query_meta_filters, 'rcl_code', 'c.rcl_code');
            _query_meta_filters := replace(_query_meta_filters, 'rule_code', 'c.rule_code');
        END IF;
        _temp_sql := 'CREATE TEMP TABLE "' || _temp_table || '" ON COMMIT DROP AS SELECT c.rule_code, c.psa_code FROM inventory_smart.rcl_constraint_master c' || _where || _query_meta_filters ||';';
        RAISE NOTICE '_temp_sql: %', _temp_sql;
        EXECUTE _temp_sql;
		if _is_all_records_selected and jsonb_array_length(_excluded_rows) > 0 then
            d_temp_sql := format('
                delete from "%s" 
                where (rule_code, psa_code) in (
                    select (value->>''rule_code'')::integer as rule_code,
                           (value->>''psa_code'')::varchar as psa_code
                    from jsonb_array_elements(%L::jsonb) as value
                )', _temp_table, _excluded_rows);
			execute d_temp_sql;
		end if;
    END IF;

    _update_values := $3;
    
    -- Extract and remove wos from the update string
    IF position('wos' in _update_values) > 0 THEN
        BEGIN
            -- Extract the WOS value using regex
            SELECT regexp_matches(_update_values, _wos_regex) INTO _wos_matches;
            IF _wos_matches IS NOT NULL AND array_length(_wos_matches, 1) > 0 THEN
                _wos_increment_value := _wos_matches[1]::numeric;
                RAISE NOTICE 'Extracted WOS value: %', _wos_increment_value;

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
                RAISE NOTICE '_wos_assignment: %', _wos_assignment;

                -- Normalize any case where set clause has only "set" left
                IF trim(_update_values) = 'set' THEN
                    _update_values := 'set ' || _wos_assignment;
                ELSIF _update_values ~* '^set\\b' THEN
                    _update_values := _update_values || ', ' || _wos_assignment;
                ELSIF _update_values = '' THEN
                    _update_values := _wos_assignment;
                ELSE
                    _update_values := _update_values || ', ' || _wos_assignment;
                END IF;
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
                RAISE NOTICE 'Extracted DOS value: %', _wos_increment_value;

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
                RAISE NOTICE '_dos_assignment: %', _wos_assignment;

                -- Normalize any case where set clause has only "set" left
                IF trim(_update_values) = 'set' THEN
                    _update_values := 'set ' || _wos_assignment;
                ELSIF _update_values ~* '^set\\b' THEN
                    _update_values := _update_values || ', ' || _wos_assignment;
                ELSIF _update_values = '' THEN
                    _update_values := _wos_assignment;
                ELSE
                    _update_values := _update_values || ', ' || _wos_assignment;
                END IF;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE EXCEPTION 'Error extracting dos: %', SQLERRM;
        END;
    END IF;
    
    -- Check if rule_name is in the values to be updated
    IF position('rule_name' in _update_values) > 0 THEN
        -- Extract rule_name value using a more robust approach
        BEGIN
            SELECT regexp_matches(_update_values, _rule_name_regex) INTO _rule_name_matches;
            IF _rule_name_matches IS NOT NULL AND array_length(_rule_name_matches, 1) > 0 THEN
                _rule_name := trim(_rule_name_matches[1]);
                
                -- Remove rule_name from the update string more carefully
                _update_values := regexp_replace(_update_values, 'rule_name\s*=\s*[^,]+(,|$)', '', 'g');
                -- Clean up any trailing commas
                _update_values := regexp_replace(_update_values, ',\s*$', '');
                
                -- Update rule_name in rcl_constraint_master_rule
                EXECUTE 'UPDATE inventory_smart.rcl_constraint_master_rule 
                         SET rule_name = ' || quote_literal(_rule_name) || '
                         WHERE rule_code IN (SELECT rule_code FROM "' || _temp_table || '")';
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE EXCEPTION 'Error extracting rule_name: %', SQLERRM;
        END;
    END IF;
    

    IF _update_values IS NOT NULL AND trim(_update_values) <> '' THEN
        BEGIN
            _temp_sql := 'UPDATE inventory_smart.rcl_constraint_master 
                          ' || _update_values || ', updated_by = ' || $5 || ', updated_at = now() 
                          WHERE (rule_code, psa_code) IN (SELECT rule_code, psa_code FROM "' || _temp_table || '")';
            _temp_sql := regexp_replace(_temp_sql, 'set\s*,\s*', 'set ', 'gi');
			RAISE NOTICE '_temp_sql: %', _temp_sql;
            EXECUTE _temp_sql;
            
            IF _is_wos_incremented AND (position('wos' in _update_values) > 0 or position('dos' in _update_values) > 0) THEN
				_exceptions_update_values := 'set ' || _wos_assignment;
                _temp_sql := 'UPDATE inventory_smart.rcl_constraint_master_exceptions 
                              ' || _exceptions_update_values || ', updated_by = ' || $5 || ', updated_at = now() 
                              WHERE (rule_code, store_code) IN (
                                  SELECT t.rule_code, psaf.store_code 
                                  FROM "' || _temp_table || '" t
                                  JOIN global.product_store_attributes_filter psaf ON t.psa_code = psaf.psa_code
                            )';
				RAISE NOTICE 'exception_temp_sql: %', _temp_sql;
                EXECUTE _temp_sql;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE EXCEPTION 'Error updating fields: %', SQLERRM;
        END;
    END IF;

end
$function$
;