--liquibase formatted sql
--changeset tarunreddy.challa:oms_update_rcl_constraints_partial runOnChange:true stripComments:false splitStatements:false context:intial labels:oms_update_rcl_constraints_partial
--comment: intial changeset for oms_update_rcl_constraints_partial
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.oms_update_rcl_constraints_partial(_selections jsonb, _product_filters jsonb, _values text, _meta_filters jsonb, _updated_by integer);
CREATE OR REPLACE FUNCTION inventory_smart.oms_update_rcl_constraints_partial(_selections jsonb, _product_filters jsonb, _values text, _meta_filters jsonb, _updated_by integer)
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
/*s
Description: Inputs: $1 = set all/ selections values, $2 = product filters, $3 = store filters, $4 = new values for the filters, $5 = meta filters, $6 = created by.
This sp is used to update the base table directly. 
ample call: select * from inventory_smart.update_rcl_constraints('[{"rule_code":2}, {"rule_code":3}]', '{}'::jsonb,
'{ "created_at":"2024-05-20", "validity":"{[2024-09-01,2024-10-31]}","created_by":1}'::jsonb, '{}'::jsonb, 99);
*/
begin
    _query_meta_filters := inventory_smart.form_rcl_table_query($4);
   raise notice '1';
	_pa_query := global.form_main_table_filters('product_attributes_filter', $2);
	select
		array_agg(rcl_code),
		'array[' || string_agg('rcl_hash->>' || quote_literal(rcl_code), ', ') || ']::text[] as rcl_hash' into _rcl_codes, _hash_cols 
	from global.rcl_master 
	where not is_deleted
	and module_code = '170'
	and not is_default
	group by is_deleted;
--    _query_pa := replace(REPLACE(_query_pa, '(rcl_dimension->>''', ''), ''')', '');
   
   raise notice '2';

    IF jsonb_array_length($1) > 0 THEN
        FOR _set IN SELECT * FROM jsonb_array_elements($1) LOOP
            FOR _key, _value IN SELECT * FROM jsonb_each_text(_set) LOOP
                _con := array_append(_con, _key || ' = ' || _value);
                RAISE NOTICE '_con: %', _con;
            END LOOP;
            _final := array_append(_final, '(' || array_to_string(_con, ' AND ') || ')');
            _con := '{}';
        END LOOP;
        
        IF cardinality(_final) > 0 THEN
            _where := ' WHERE ' || array_to_string(_final, ' OR ');
        END IF;
        RAISE NOTICE 'where: %', _where;
        
        _temp_sql := 'CREATE TEMP TABLE "' || _temp_table || '" ON COMMIT DROP AS SELECT rule_code FROM inventory_smart.rcl_oms_constraint_master' ||  _where || ';';
        RAISE NOTICE '_temp_sql: %', _temp_sql;
        EXECUTE _temp_sql;
    ELSE 
        _where := ' JOIN (
            SELECT rcl_code, rule_code, md5(r.rcl_dimension::text) rcl_hash, rcl_dimension 
            FROM inventory_smart.rcl_oms_constraint_master_rule r 
            JOIN (
                SELECT ' || _hash_cols || ' FROM global.product_attributes_filter ' || _pa_query || ' GROUP BY 1
            ) paf 
            ON md5(r.rcl_dimension::text) = ANY(rcl_hash)
            AND r.rcl_code = ANY(' || quote_literal(_rcl_codes::text) || '::int[])
            GROUP BY 1,2,3,4
        ) r on r.rule_code = c.rule_code and r.rcl_code = c.rcl_code ';

        _temp_sql := 'CREATE TEMP TABLE "' || _temp_table || '" ON COMMIT DROP AS SELECT c.rule_code FROM inventory_smart.rcl_oms_constraint_master c' || _where || _query_meta_filters ||';';
        RAISE NOTICE '_temp_sql: %', _temp_sql;
        EXECUTE _temp_sql;
    END IF;
    _temp_sql := 'UPDATE inventory_smart.rcl_oms_constraint_master ' || $3 || ', updated_by = ' || $5 ||', updated_at = now() where (rule_code) IN (SELECT rule_code FROM "' ||_temp_table || '");';
	RAISE NOTICE '_temp_sql: %', _temp_sql;
    EXECUTE _temp_sql;
end
$function$
;
