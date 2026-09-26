--liquibase formatted sql
--changeset tarunreddy.challa:oms_update_rcl_constraints_update5 runOnChange:true stripComments:false splitStatements:false context:intial labels:oms_update_rcl_constraints_update2
--comment: intial changeset for oms_update_rcl_constraints_update5
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.oms_update_rcl_constraints(_selections jsonb, _product_filters jsonb, _values jsonb, _meta_filters jsonb, _updated_by integer);
CREATE OR REPLACE FUNCTION inventory_smart.oms_update_rcl_constraints(_selections jsonb, _product_filters jsonb, _values jsonb, _meta_filters jsonb, _updated_by integer)
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
'{ "created_at":"2024-05-20", "validity":"{[2024-09-01,2024-10-31]}","created_by":1,"level_of_application":"applicable_all"}'::jsonb, '{}'::jsonb, 99);
*/
begin
    _query_meta_filters := inventory_smart.form_rcl_table_query($4);
   raise notice '1';
    _pa_query := global.form_main_table_filters('product_attributes_filter', $2);
    select
        array_agg(rcl_code),
        'array[' || string_agg('rcl_hash->>' || quote_literal(rcl_code), ', ') || ']::text[] as rcl_hashes' into _rcl_codes, _hash_cols 
    from global.rcl_master 
    where not is_deleted
    and module_code = '7001'
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
        
        _temp_sql := 'CREATE TEMP TABLE "' || _temp_table || '" ON COMMIT DROP AS SELECT rcl_code, rule_code, ' || $5 || ' AS updated_by, MAX(created_at) created_at, MAX(created_by) created_by FROM inventory_smart.rcl_oms_constraint_master' ||  _where || ' group by 1,2,3;';
        RAISE NOTICE '_temp_sql: %', _temp_sql;
        EXECUTE _temp_sql;
    ELSE 
        _where := ' join (
        with paf as materialized(select rcl_hash from
                                    (
                                    select unnest(rcl_hashes) as rcl_hash from
                                        (
                                        select ' || _hash_cols || ' from global.product_attributes_filter ' || _pa_query || ' and active 
                                        )x 
                                    ) y where rcl_hash is not null group by 1
                                )
	        select rcl_code, rule_code, md5(rcl_dimension::text) rcl_hash, rcl_dimension from inventory_smart.rcl_oms_constraint_master_rule where rcl_code = any(' || quote_literal(_rcl_codes::text) || '::int[]) and md5(rcl_dimension::text) 
                in (
                    select rcl_hash from paf
                    )
                    group by 1,2,3,4
                ) r on r.rule_code = c.rule_code and r.rcl_code = c.rcl_code ';

        _temp_sql := 'CREATE TEMP TABLE "' || _temp_table || '" ON COMMIT DROP AS SELECT c.rcl_code, c.rule_code, ' || $5 || ' AS updated_by, MAX(created_at) created_at, MAX(created_by) created_by FROM inventory_smart.rcl_oms_constraint_master c' || _where || _query_meta_filters || ' group by 1,2,3;';
        RAISE NOTICE '_temp_sql: %', _temp_sql;
        EXECUTE _temp_sql;
    END IF;

    -- Delete from persistent table --
    _temp_sql := 'DELETE FROM inventory_smart.rcl_oms_constraint_master WHERE (rule_code) IN (SELECT rule_code FROM "' ||_temp_table || '");';
    RAISE NOTICE 'delete: %', _temp_sql;
    EXECUTE _temp_sql;
   FOR _set IN SELECT * FROM jsonb_array_elements($3) LOOP
       raise notice '_set: %', _set;
        execute 'drop table if exists "' || _temp_table_2 || '";';
      _temp_sql := 'create temp table "' || _temp_table_2 || '" as
                    select 
                        (' || case when (_set ? 'min_replenishment_quantity') and (_set->>'min_replenishment_quantity' is null) then 'NULL' 
                            when _set ? 'min_replenishment_quantity' then quote_literal(_set->>'min_replenishment_quantity')
                            else 'NULL' end || ')::float4 as min_replenishment_quantity,
                        (' || case when (_set ? 'max_replenishment_quantity') and (_set->>'max_replenishment_quantity' is null) then 'NULL' 
                            when _set ? 'max_replenishment_quantity' then quote_literal(_set->>'max_replenishment_quantity')
                            else 'NULL' end || ')::float4 as max_replenishment_quantity,
                        (' || case when (_set ? 'order_multiple') and (_set->>'order_multiple' is null) then 'NULL' 
                            when _set ? 'order_multiple' then quote_literal(_set->>'order_multiple')
                            else 'NULL' end || ')::int as order_multiple,
                        (' || case when (_set ? 'moq_tolerance') and (_set->>'moq_tolerance' is null) then 'NULL' 
                            when _set ? 'moq_tolerance' then quote_literal(_set->>'moq_tolerance')
                            else 'NULL' end || ')::float4 as moq_tolerance, 
                        (' || case when (_set ? 'level_of_application') and (_set->>'level_of_application' is null) then 'NULL' 
                            when _set ? 'level_of_application' then quote_literal(_set->>'level_of_application')
                            else 'NULL' end || ')::varchar as level_of_application';
                execute _temp_sql;
                    raise notice 'create temp table 2: %', _temp_sql;
                    _temp_sql := 'INSERT INTO inventory_smart.rcl_oms_constraint_master
                    (rcl_code, rule_code, min_replenishment_quantity, max_replenishment_quantity, order_multiple, moq_tolerance, level_of_application, created_by, created_at, updated_by, updated_at)
                    SELECT 
                        x.rcl_code, 
                        x.rule_code, 
                        COALESCE(y.min_replenishment_quantity, 1) AS min_replenishment_quantity, 
                        COALESCE(y.max_replenishment_quantity, 99999) AS max_replenishment_quantity, 
                        COALESCE(y.order_multiple, 1) AS order_multiple, 
                        COALESCE(y.moq_tolerance, 0.5) AS moq_tolerance, 
                        COALESCE(y.level_of_application, ''sum_all'') AS level_of_application, 
                        x.created_by, 
                        x.created_at, 
                        x.updated_by, 
                        NOW() AS updated_at
                    FROM "' || _temp_table || '" x
                    CROSS JOIN "' || _temp_table_2 || '" y;';
            execute _temp_sql;
                raise notice 'insert query: %', _temp_sql;
                    end loop;


end
$function$
;