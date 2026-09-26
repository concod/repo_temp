--liquibase formatted sql
--changeset shashwat.yadav:update_rcl_create_constraints_exceptions_new_change runOnChange:true stripComments:false splitStatements:false context:Release_1_4 labels:liquibase_project_start
--comment: initial changeset for update_rcl_create_constraints_exceptions_new_change
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.update_rcl_create_constraints_exceptions(_persisted_temp_tbl_name text, _unique_id text, _select jsonb, _value jsonb, _search_meta jsonb, _created_by int4, _is_all_records_selected boolean, _excluded_rows jsonb);
-- DROP FUNCTION inventory_smart.update_rcl_create_constraints_exceptions(text, jsonb, jsonb, jsonb, int4);

CREATE OR REPLACE FUNCTION inventory_smart.update_rcl_create_constraints_exceptions(_persisted_temp_tbl_name text, _select jsonb, _value jsonb, _search_meta jsonb, _created_by integer, _is_all_records_selected boolean, _excluded_rows jsonb)
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
    d_temp_sql text;
    /*
    Description: Inputs: $1 = persistent temp table name, $2 = jsonb array of set all, selections filters, $3 = new values for the filters, $4 = meta filters, $5 = created by.
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
        
        _temp_sql := 'CREATE TEMP TABLE "' || _temp_table || '" on commit drop AS SELECT * FROM public.'  || $1 || _where || ';';
        RAISE NOTICE '_temp_sql: %', _temp_sql;
        EXECUTE _temp_sql;
           
    ELSE
        _temp_sql := 'CREATE TEMP TABLE "' || _temp_table || '" on commit drop AS SELECT * FROM public.'  || $1 || _query_meta_filters || ';';
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

    -- Delete from persistent table --
    _temp_sql := 'DELETE FROM public.' || $1 || ' t USING "' || _temp_table || '" s
                  WHERE t.rule_code = s.rule_code
                    AND t.store_code = s.store_code;';
    RAISE NOTICE 'delete: %', _temp_sql;
    EXECUTE _temp_sql;
   
   FOR _set IN SELECT * FROM jsonb_array_elements($3) LOOP
       raise notice '_set: %', _set;
		execute 'drop table if exists "' || _temp_table_2 || '";';
      _temp_sql := 'create temp table "' || _temp_table_2 || '" as
					select 
                        (' || case when _set->>'wos' is null then 'NULL' else quote_literal(_set->>'wos') end || ')::float4 as wos,
                        (' || case when _set->>'dos' is null then 'NULL' else quote_literal(_set->>'dos') end || ')::float4 as dos,
						(' || case when _set->>'min_stock' is null then 'NULL' else quote_literal(_set->>'min_stock') end || ')::float4 as min_stock,
						(' || case when _set->>'max_stock' is null then 'NULL' else quote_literal(_set->>'max_stock') end || ')::float4 as max_stock,
                        (' || case when _set->>'st' is null then 'NULL' else quote_literal(_set->>'st') end || ')::int as st,
						daterange(' || quote_literal(_set->>'start_date') || ', date(' || quote_literal(_set->>'end_date') || '::timestamp + interval ''1 day'')) as validity;';
       			execute _temp_sql;
					raise notice 'create temp table 2: %', _temp_sql;
                    _temp_sql := format(
                        'INSERT INTO public.%I
                         SELECT (jsonb_populate_record(
                                    NULL::public.%I,
                                    to_jsonb(x) || jsonb_strip_nulls(jsonb_build_object(
                                        ''wos'', y.wos,
                                        ''dos'', y.dos,
                                        ''min_stock'', y.min_stock,
                                        ''max_stock'', y.max_stock,
                                        ''st'', y.st,
                                        ''validity'', y.validity
                                    ))
                                )).*
                         FROM "%s" x
                         CROSS JOIN "%s" y;',
                        $1, $1, _temp_table, _temp_table_2
                    );
                    RAISE NOTICE 'insert query: %', _temp_sql;
                    EXECUTE _temp_sql;
					end loop;
END;
$function$
;
