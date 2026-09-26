--liquibase formatted sql
--changeset shashwat.yadav:rcl_network_rule_update runOnChange:true stripComments:false splitStatements:false context:MTP-74818 labels:MTP-74818
--comment: MTP-74818 Used to update a rcl network rule
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.rcl_network_rule_update(_selections jsonb, _product_filters jsonb, _values jsonb, _meta_filters jsonb, _updated_by integer, _is_all_records_selected boolean, _excluded_rows jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.rcl_network_rule_update(_selections jsonb, _product_filters jsonb, _values jsonb, _meta_filters jsonb, _updated_by integer, _is_all_records_selected boolean, _excluded_rows jsonb)
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
_hash_cols text;
_rcl_codes integer[];
_pa_query text;
_key text;
_value text;
_con text[];
_key_cols text;
_set jsonb;
_temp_sql text;
_temp_table text := gen_random_uuid();
_temp_table_2 text := gen_random_uuid();
_rcl_code text;
_max_validity text;
_min_validity text;

begin
    _query_meta_filters := inventory_smart.form_rcl_table_query($4);
   	raise notice '_query_meta_filters: %', _query_meta_filters;

	_pa_query := global.form_main_table_filters('product_attributes_filter', $2);
    raise notice '_pa_query: %', _pa_query;

	select
		array_agg(rcl_code),
		'array[' || string_agg('rcl_hash->>' || quote_literal(rcl_code), ', ') || ']::text[] as rcl_hash' into _rcl_codes, _hash_cols 
	from global.rcl_master 
	where not is_deleted
	and module_code = '71'
	and not is_default
	group by is_deleted;
	raise notice '_rcl_codes, _hash_cols: %, %', _rcl_codes, _hash_cols;

	if jsonb_array_length($1) > 0 then
	        FOR _set IN SELECT * FROM jsonb_array_elements($1) LOOP
	            FOR _key, _value IN SELECT * FROM jsonb_each_text(_set) LOOP 
	                IF _key in ('rule_code', 'rcl_code') THEN 
	                    _con := array_append(_con,  _key || ' = ' || quote_literal(_value));
	                ELSE
	                    _con := array_append(_con,  _key || ' = ' || _value);
	                    RAISE NOTICE '_con: %', _con;
	                END IF;
	            END LOOP;
	            _final := array_append(_final, '(' || array_to_string(_con, ' AND ') ||')');
	           	RAISE NOTICE '_final: %', _final;
	            _con := '{}';
	        END LOOP;
	       
	        IF cardinality(_final) > 0 THEN
	            _where := ' WHERE ' || array_to_string(_final, ' OR ');
	        END IF;
	        RAISE NOTICE 'where: %', _where;
	        
	        _temp_sql := 'CREATE TEMP TABLE "' || _temp_table || '" AS SELECT rcl_code, rule_code, ' || $5 || ' as updated_by, MAX(created_at) created_at, MAX(created_by) created_by FROM inventory_smart.rcl_network_master' ||  _where || ' group by 1,2;';
	        RAISE NOTICE '_temp_sql: %', _temp_sql;
	        EXECUTE _temp_sql;

    ELSE 
        _where := ' JOIN (
            SELECT rcl_code, rule_code, md5(r.rcl_dimension::text) rcl_hash, rcl_dimension, rule_name
            FROM inventory_smart.rcl_network_rule r 
            JOIN (
                SELECT ' || _hash_cols || ' FROM global.product_attributes_filter ' || _pa_query || ' and active GROUP BY 1
            ) paf 
            ON md5(r.rcl_dimension::text) = ANY(rcl_hash)
            AND r.rcl_code = ANY(' || quote_literal(_rcl_codes::text) || '::int[])
            GROUP BY 1,2,3
        ) r USING(rule_code, rcl_code)';

        _temp_sql := 'CREATE TEMP TABLE "' || _temp_table || '" AS SELECT rcl_code, rule_code, ' || $5 || ' AS  updated_by, MAX(created_at) created_at, MAX(created_by) created_by FROM inventory_smart.rcl_network_master' || _where || _query_meta_filters || ' group by 1,2;';
        RAISE NOTICE '_temp_sql: %', _temp_sql;
        EXECUTE _temp_sql;
		if _is_all_records_selected and jsonb_array_length(_excluded_rows) > 0 then
			RAISE NOTICE 'inside_temp_sql: %', _temp_sql;
			execute 'delete from "' || _temp_table || '" temp_table where exists (select 1 from jsonb_array_elements(' || quote_literal(_excluded_rows::text) || ') where (value->>''rule_code'')::integer = temp_table.rule_code)';
		end if;
    END IF;
    
	-- Delete from persistent table --
	_temp_sql := 'DELETE FROM inventory_smart.rcl_network_master WHERE (rule_code, rcl_code, validity) IN (SELECT rule_code, rcl_code, validity FROM ' || quote_ident(_temp_table) || ')';
	RAISE NOTICE 'delete: %', _temp_sql;
	EXECUTE _temp_sql;

    FOR _set IN SELECT * FROM jsonb_array_elements($3) LOOP
       	raise notice '_set: %', _set;

        IF (_set->>'start_date') IS NULL OR (_set->>'end_date') IS NULL THEN
            RAISE EXCEPTION 'start_date and end_date cannot be null';
        END IF;

		execute 'drop table if exists "' || _temp_table_2 || '";';
     	_temp_sql := 'create temp table "' || _temp_table_2 || '" as
					select 
						(' || case when _set->>'supply_network_id' is null then 'NULL' else quote_literal(_set->>'supply_network_id') end || ')::integer as supply_network,
						daterange(' || quote_literal(_set->>'start_date') || ', date(' || quote_literal(_set->>'end_date') || '::timestamp + interval ''1 day'')) as validity;';
       	execute _temp_sql;
		raise notice 'create temp table 2: %', _temp_sql;

		_temp_sql := 'INSERT INTO inventory_smart.rcl_network_master
					(rcl_code, rule_code, supply_network, created_by, created_at, updated_by, updated_at, validity)
					select x.rcl_code, x.rule_code, y.supply_network, x.created_by, x.created_at, x.updated_by, now(), y.validity  from "' || _temp_table || '" x cross join "' || _temp_table_2 || '" y;';
		raise notice 'insert query: %', _temp_sql;
		execute _temp_sql;

		end loop;

	    FOR _rcl_code IN EXECUTE 'select distinct rcl_code::text from "' || _temp_table || '"' LOOP
	        execute 'select min(lower(validity)), max(upper(validity)) 
	                from inventory_smart.rcl_network_master 
	                where rcl_code = ' || _rcl_code || ';' 
	        into _min_validity, _max_validity;
	        
	        execute 'update global.rcl_master 
	                set validity = datemultirange(daterange(' || quote_literal(_min_validity) || '::date, ' || quote_literal(_max_validity) || '::date)) 
	                where rcl_code = ' || _rcl_code || ';';
	    END LOOP;
END;
$function$
;
