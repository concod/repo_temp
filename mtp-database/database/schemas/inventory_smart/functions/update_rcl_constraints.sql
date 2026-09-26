--liquibase formatted sql
--changeset liquibase:update_rcl_constraints_generic_updated runOnChange:true stripComments:false splitStatements:false context:Release_1_4 labels: 117864
--comment: initial changeset for update_rcl_constraints_generic updated for setall
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.update_rcl_constraints(_selections jsonb, _product_filters jsonb, _values jsonb, _meta_filters jsonb, _updated_by int4, _is_all_records_selected boolean, _excluded_rows jsonb);
DROP FUNCTION IF EXISTS inventory_smart.update_rcl_constraints(_selections jsonb, _product_filters jsonb, _values jsonb, _meta_filters jsonb, _updated_by int4, _is_all_records_selected boolean, _excluded_rows jsonb, additional_data jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.update_rcl_constraints(_selections jsonb, _product_filters jsonb, _values jsonb, _meta_filters jsonb, _updated_by integer, _is_all_records_selected boolean, _excluded_rows jsonb, additional_data jsonb)
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
_temp_table text := gen_random_uuid();
_temp_table_2 text := gen_random_uuid();
_rcl_code text;
_max_validity text;
_min_validity text;
d_temp_sql text;
_rule_name text;
_all_store_hierarchies text;
_additional_select_columns text;

/*s
Description: Inputs: $1 = set all/ selections values, $2 = product filters, $3 = store filters, $4 = new values for the filters, $5 = meta filters, $6 = created by.
This sp is used to update the base table directly. 
ample call: select * from inventory_smart.update_rcl_constraints('[{"rule_code":2, "psa_code":680}, {"rule_code":3, "psa_code":1143}]', '{}'::jsonb,
'{ "created_at":"2024-05-20", "validity":"{[2024-09-01,2024-10-31]}","created_by":1}'::jsonb, '{}'::jsonb, 99);
*/
begin
    _query_meta_filters := inventory_smart.form_rcl_table_query($4);

	select  string_agg(attribute_name, ', ') into _all_store_hierarchies from inventory_smart.rcl_master_attribute_list
						 where attribute_name <> 'psa_level'
                         and attribute_dimension = 'store';

   raise notice '1';
   
   _additional_select_columns := coalesce($8->>'select_columns', '');
   raise notice '_additional_select_columns: %', _additional_select_columns;

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
        
        _temp_sql := 'CREATE TEMP TABLE "' || _temp_table || '" ON COMMIT DROP AS SELECT rcl_code, rule_code, psa_code, ' || $5 || ' AS updated_by, MAX(created_at) created_at, MAX(created_by) created_by FROM inventory_smart.rcl_constraint_master' ||  _where || ' group by 1,2,3,4;';
        RAISE NOTICE '_temp_sql: %', _temp_sql;
        EXECUTE _temp_sql;
    ELSE 
        _where := ' 
        join (
            with paf as materialized(
	            select 
                    rcl_hash 
                    ' || _additional_select_columns || ' 
                from (
                    select 
                        unnest(rcl_hashes) as rcl_hash 
                        ' || _additional_select_columns || ' 
                    from (
                        select 
                            ' || _hash_cols || ' 
                            ' || _additional_select_columns || ' 
                        from global.product_attributes_filter ' || _pa_query || ' and active) x 
                    ) y 
                where rcl_hash is not null group by 1 ' || _additional_select_columns || '
            )
            select 
                rcl_code, 
                rule_code, 
                rule_name,
                md5(rcl_dimension::text) rcl_hash, 
                rcl_dimension
                ' || _additional_select_columns || '
            from inventory_smart.rcl_constraint_master_rule
            join paf on rcl_hash = md5(rcl_dimension::text)
            WHERE  rcl_code = any(' || quote_literal(_rcl_codes::text) || '::int[])
            group by 1,2,3,4,5 ' || _additional_select_columns || '
        ) r 
        on r.rule_code = c.rule_code and r.rcl_code = c.rcl_code ';

        _where := ' join inventory_smart.rcl_psa_config_table psaf on c.psa_code = psaf.psa_code ' || _where;
        _temp_sql := 'CREATE TEMP TABLE "' || _temp_table || '" ON COMMIT DROP AS SELECT c.rcl_code, c.rule_code, c.psa_code, ' || $5 || ' AS updated_by, ' || _all_store_hierarchies || ', MAX(created_at) created_at, MAX(created_by) created_by FROM inventory_smart.rcl_constraint_master c' || _where;
        -- Add the table alias to the meta filters query for both rcl_code and rule_code
        IF _query_meta_filters IS NOT NULL AND _query_meta_filters != '' THEN
            _query_meta_filters := replace(_query_meta_filters, 'rcl_code', 'c.rcl_code');
            _query_meta_filters := replace(_query_meta_filters, 'rule_code', 'c.rule_code');
            _temp_sql := _temp_sql || _query_meta_filters;
        END IF;
        
        _temp_sql := _temp_sql || ' group by 1,2,3,4, ' || _all_store_hierarchies || ';';
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
    _temp_sql := 'DELETE FROM inventory_smart.rcl_constraint_master WHERE (rule_code, psa_code) IN (SELECT rule_code, psa_code FROM "' ||_temp_table || '");';
    RAISE NOTICE 'delete: %', _temp_sql;
    EXECUTE _temp_sql;
   FOR _set IN SELECT * FROM jsonb_array_elements($3) LOOP
       raise notice '_set: %', _set;


        IF (_set->>'rule_name') IS NOT NULL THEN
            _rule_name := _set->>'rule_name';

			_temp_sql := 'UPDATE inventory_smart.rcl_constraint_master_rule
                        SET rule_name = ' || quote_literal(_rule_name) || '
                        WHERE (rule_code, rcl_code) IN (SELECT rule_code, rcl_code FROM "' || _temp_table || '")';
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
						daterange(' || quote_literal(coalesce(_set->>'start_date', current_date::text)) || ', date(' || quote_literal(coalesce(_set->>'end_date', '2050-12-31')) || '::timestamp + interval ''1 day'')) as validity;';
       			execute _temp_sql;
					raise notice 'create temp table 2: %', _temp_sql;
					_temp_sql := 'INSERT INTO inventory_smart.rcl_constraint_master
					(rcl_code, rule_code, psa_code, wos, dos, min_stock, min_distribution, max_stock, st, created_by, created_at, updated_by, updated_at, validity)
					select x.rcl_code, x.rule_code, x.psa_code, y.wos, y.dos, y.min_stock, y.min_distribution, y.max_stock, y.st, x.created_by, x.created_at, x.updated_by, now(), y.validity  from "' || _temp_table || '" x cross join "' || _temp_table_2 || '" y;';
			execute _temp_sql;
				raise notice 'insert query: %', _temp_sql;
					end loop;

    FOR _rcl_code IN EXECUTE 'select distinct rcl_code::text from "' || _temp_table || '"' LOOP
        execute 'select min(lower(validity)), max(upper(validity)) 
                from inventory_smart.rcl_constraint_master 
                where rcl_code = ' || _rcl_code || ';' 
        into _min_validity, _max_validity;
        
        execute 'update global.rcl_master 
                set validity = datemultirange(daterange(' || quote_literal(_min_validity) || '::date, ' || quote_literal(_max_validity) || '::date)) 
                where rcl_code = ' || _rcl_code || ';';
    END LOOP;

end
$function$
;