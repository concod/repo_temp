--liquibase formatted sql
--changeset shashwat.yadav:update_rcl_constraints_exceptions_new_change runOnChange:true stripComments:false splitStatements:false context:Release_1_5 labels:liquibase_project_start
--comment: initial changeset for update_rcl_constraints_exceptions_new_change
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.update_rcl_constraints_exceptions(_selections jsonb, _product_filters jsonb, _store_filters jsonb, _values jsonb, _meta_filters jsonb, _updated_by int4, _is_all_records_selected boolean, _excluded_rows jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.update_rcl_constraints_exceptions(_selections jsonb, _product_filters jsonb, _store_filters jsonb, _values jsonb, _meta_filters jsonb, _updated_by integer, _is_all_records_selected boolean, _excluded_rows jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare 
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
_query_final text := '';
_temp_table text := gen_random_uuid();
_temp_table_2 text := gen_random_uuid();
d_temp_sql text;
/*s
Description: Inputs: $1 = set all/ selections values, $2 = product filters, $3 = store filters, $4 = new values for the filters, $5 = meta filters, $6 = created by.
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
]'::jsonb, '{"search": [], "range": [], "query_type": "AND"}', 1);
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

    _query_sa := global.form_main_table_filters('store_attributes_filter', $3);

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
    
    _temp_sql := 'CREATE TEMP TABLE "' || _temp_table || '" ON COMMIT DROP AS SELECT x.rcl_code, x.rule_code, x.store_code, x.exception_rule_name, x.updated_by, x.created_by, x.created_at FROM (SELECT rcl_code, rule_code, store_code, exception_rule_name, ' || _updated_by || ' AS updated_by, MAX(created_by) created_by, MAX(created_at) created_at FROM inventory_smart.rcl_constraint_master_exceptions' || _where || ' group by 1,2,3,4,5) x JOIN (SELECT * from global.store_attributes_filter ' || case when nullif(_query_sa, '') is null then ' where ' else _query_sa || ' and ' end || 'active ) s USING (store_code);';
    RAISE NOTICE '_temp_sql: %', _temp_sql;
    EXECUTE _temp_sql;

ELSE 
    _where := ' 
    JOIN (
        with paf_cte as materialized(
            SELECT 
                ' || _hash_cols || ' 
            FROM global.product_attributes_filter ' || _pa_query || ' and active GROUP BY 1
            )
        SELECT 
            rcl_code, 
            rule_code,
            md5(r.rcl_dimension::text) rcl_hash,
            rcl_dimension,
            rule_name 
        FROM inventory_smart.rcl_constraint_master_rule r 
        JOIN paf_cte ON md5(r.rcl_dimension::text) = ANY(rcl_hash) 
        WHERE  rcl_code = any(' || quote_literal(_rcl_codes::text) || '::int[])
        GROUP BY 1,2,3,4,5
        ) r on r.rule_code = c.rule_code and r.rcl_code = c.rcl_code ';

    _temp_sql := 'CREATE TEMP TABLE "' || _temp_table || '" ON COMMIT DROP AS SELECT x.rcl_code, x.rule_code, x.store_code, x.exception_rule_name, x.updated_by, x.created_by, x.created_at FROM (SELECT c.rcl_code, c.rule_code, r.rcl_dimension, c.store_code, c.exception_rule_name, ' || _updated_by || ' AS updated_by, MAX(created_by) created_by, MAX(created_at) created_at FROM inventory_smart.rcl_constraint_master_exceptions c' || _where || ' group by 1,2,3,4,5) x JOIN (SELECT * from global.store_attributes_filter ' || case when nullif(_query_sa, '') is null then ' where ' else _query_sa || ' and ' end || ' active ) s USING (store_code) ' || _query_meta_filters || ';';
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
    _temp_sql := 'DELETE FROM inventory_smart.rcl_constraint_master_exceptions WHERE (rule_code, store_code) IN (SELECT rule_code, store_code FROM "' ||_temp_table || '");';
    RAISE NOTICE 'delete: %', _temp_sql;
    EXECUTE _temp_sql;
   FOR _set IN SELECT * FROM jsonb_array_elements(_values) LOOP
       raise notice '_set: %', _set;
		execute 'drop table if exists "' || _temp_table_2 || '";';
      _temp_sql := 'create temp table "' || _temp_table_2 || '" as
					select 
                        (' || case when _set->>'wos' is null then 'NULL' else quote_literal(_set->>'wos') end || ')::float4 as wos,
                        (' || case when _set->>'dos' is null then 'NULL' else quote_literal(_set->>'dos') end || ')::float4 as dos,
						(' || case when _set->>'min_stock' is null then 'NULL' else quote_literal(_set->>'min_stock') end || ')::float4 as min_stock,
						(' || case when _set->>'max_stock' is null then 'NULL' else quote_literal(_set->>'max_stock') end || ')::float4 as max_stock,
						(' || case when _set->>'st' is null then 'NULL' else quote_literal(_set->>'st') end || ')::int4 as st,
						daterange(' || quote_literal(COALESCE(_set->>'start_date', current_date::text)) || ', date(' || quote_literal(COALESCE(_set->>'end_date', '2050-12-30')) || '::timestamp + interval ''1 day'')) as validity;';
       			execute _temp_sql;
					raise notice 'create temp table 2: %', _temp_sql;
					_temp_sql := 'INSERT INTO inventory_smart.rcl_constraint_master_exceptions
					(rcl_code, rule_code, store_code, wos, dos, min_stock, max_stock, st, created_by, created_at, updated_by, updated_at, validity, exception_rule_name)
					select x.rcl_code, x.rule_code, x.store_code, y.wos, y.dos, y.min_stock, y.max_stock, y.st, x.created_by, x.created_at, x.updated_by, now(), y.validity, x.exception_rule_name from "' || _temp_table || '" x cross join "' || _temp_table_2 || '" y;';
			execute _temp_sql;
				raise notice 'insert query: %', _temp_sql;
					end loop;


end
$function$
;