--liquibase formatted sql
--changeset shashwat.yadav:update_rcl_create_constraints_new_change runOnChange:true stripComments:false splitStatements:false context:Release_1_4 labels:liquibase_project_start
--comment: initial changeset for update_rcl_create_constraints_new_change
--rollback: SELECT 1
-- this function is intermediate function in the creation of new constraints. this is executed after rcl_create_constraints sp.
DROP FUNCTION IF EXISTS inventory_smart.update_rcl_create_constraints(_persisted_temp_tbl_name text, _select jsonb, _value jsonb, _search_meta jsonb, _created_by integer, _is_all_records_selected boolean, _excluded_rows jsonb);
DROP FUNCTION IF EXISTS inventory_smart.update_rcl_create_constraints(_persisted_temp_tbl_name text, _select jsonb, _value jsonb, _search_meta jsonb, _created_by integer, _is_all_records_selected boolean, _excluded_rows jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.update_rcl_create_constraints(_persisted_temp_tbl_name text, _select jsonb, _value jsonb, _search_meta jsonb, _created_by integer, _is_all_records_selected boolean, _excluded_rows jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    _query_part text;
    _query_combine text;
    _where text := '';
    _final varchar[];
    _query_meta_filters text;
    _query_sa text;
    _query_pa text;
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
    _temp_table text := gen_random_uuid();
    _temp_table_2 text := gen_random_uuid();
	_rule_name text;
    d_temp_sql text;
	_all_store_hierarchies text;
/*s
Description: Inputs: $1 = set all/ selections values, $2 = product filters, $3 = store filters, $4 = new values for the filters, $5 = meta filters, $6 = created by.
This sp is used to update the base table directly. 
ample call: select * from inventory_smart.update_rcl_constraints('[{"rule_code":2, "psa_code":680}, {"rule_code":3, "psa_code":1143}]', '{}'::jsonb,
'{ "created_at":"2024-05-20", "validity":"{[2024-09-01,2024-10-31]}","created_by":1}'::jsonb, '{}'::jsonb, 99);
*/
begin
    _query_meta_filters := inventory_smart.form_rcl_table_query(_search_meta);
	select  string_agg(attribute_name, ', ') into _all_store_hierarchies from inventory_smart.rcl_master_attribute_list
						 where attribute_name <> 'psa_level'
                         and attribute_dimension = 'store';

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
        
        _temp_sql := 'CREATE TEMP TABLE "' || _temp_table || '" on commit drop AS SELECT rcl_code, rule_code, psa_code, rule_name , store_hierarchy_level, store_dimension, ' || _all_store_hierarchies || ', ' || $5 || ' as created_by, (array_agg(rcl_dimension))[1] rcl_dimension FROM public.'  || $1 || _where || ' group by 1,2,3,4,5,6,7, ' || _all_store_hierarchies || ';';
        RAISE NOTICE '_temp_sql: %', _temp_sql;
        EXECUTE _temp_sql;
           
    ELSE
        _temp_sql := 'CREATE TEMP TABLE "' || _temp_table || '" on commit drop AS SELECT rcl_code, rule_code, psa_code, rule_name, store_hierarchy_level, store_dimension, ' || _all_store_hierarchies || ', ' || $5 || ' AS created_by, (array_agg(rcl_dimension))[1] rcl_dimension FROM public.'  || $1 || _query_meta_filters ||' group by 1,2,3,4,5,6,7, ' || _all_store_hierarchies || ';';
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

    -- Delete from persistent table --
    _temp_sql := 'DELETE FROM public.' || $1 || ' WHERE (rule_code, psa_code) IN (SELECT rule_code, psa_code FROM "' ||_temp_table || '");';
    RAISE NOTICE 'delete: %', _temp_sql;
    EXECUTE _temp_sql;
   
   FOR _set IN SELECT * FROM jsonb_array_elements($3) LOOP
       raise notice '_set: %', _set;

       IF (_set->>'rule_name') IS NOT NULL THEN
            _rule_name := _set->>'rule_name';

			_temp_sql := 'UPDATE "' || _temp_table || '" 
                        SET rule_name = ' || quote_literal(_rule_name) || ';';
            RAISE NOTICE 'Update rule_name query: %', _temp_sql;
            EXECUTE _temp_sql;
        END IF;

		execute 'drop table if exists "' || _temp_table_2 || '";';
      _temp_sql := 'create temp table "' || _temp_table_2 || '" as
					select 
                        (' || case when _set->>'wos' is null then 'NULL' else quote_literal(_set->>'wos') end || ')::float4 as wos,
                        (' || case when _set->>'dos' is null then 'NULL' else quote_literal(_set->>'dos') end || ')::float4 as dos,
						(' || case when _set->>'min_stock' is null then 'NULL' else quote_literal(_set->>'min_stock') end || ')::float4 as min_stock,
						(' || case when _set->>'min_distribution' is null then 'NULL' else quote_literal(_set->>'min_distribution') end || ')::varchar as min_distribution,
                        (' || case when _set->>'max_stock' is null then 'NULL' else quote_literal(_set->>'max_stock') end || ')::float4 as max_stock,
                        (' || case when _set->>'st' is null then 'NULL' else quote_literal(_set->>'st') end || ')::int4 as st,
						daterange(' || quote_literal(_set->>'start_date') || ', date(' || quote_literal(_set->>'end_date') || '::timestamp + interval ''1 day'')) as validity;';
       			execute _temp_sql;
					raise notice 'create temp table 2: %', _temp_sql;
					_temp_sql := 'INSERT INTO public.' || $1 || '
					(rcl_code, rule_code, rule_name, psa_code, rcl_dimension, store_hierarchy_level, store_dimension, wos, dos, min_stock, min_distribution, max_stock, st, created_by, created_at, validity,' || _all_store_hierarchies || ')
					select x.rcl_code, x.rule_code, x.rule_name, x.psa_code, x.rcl_dimension, store_hierarchy_level, store_dimension, y.wos, y.dos, y.min_stock, y.min_distribution, y.max_stock, y.st, x.created_by, now(), y.validity, ' || _all_store_hierarchies || '  from "' || _temp_table || '" x cross join "' || _temp_table_2 || '" y;';
			execute _temp_sql;
				raise notice 'insert query: %', _temp_sql;
    end loop;
END;
$function$
;