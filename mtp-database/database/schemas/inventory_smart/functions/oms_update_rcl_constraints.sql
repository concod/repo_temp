--liquibase formatted sql
--changeset priyansh.gautam:oms_update_rcl_constraints_updatte_added_paf_conditions_7 runOnChange:true stripComments:false splitStatements:false context:intial labels:oms_update_rcl_constraints_update2
--comment: MTP-113521 updated the insert query to handle null values
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.oms_update_rcl_constraints(_selections jsonb, _product_filters jsonb, _values jsonb, _meta_filters jsonb, _updated_by integer);
DROP FUNCTION IF EXISTS inventory_smart.oms_update_rcl_constraints(_selections jsonb, _product_filters jsonb, _values jsonb, _meta_filters jsonb, _updated_by integer, tenant text);
CREATE OR REPLACE FUNCTION inventory_smart.oms_update_rcl_constraints(_selections jsonb, _product_filters jsonb, _values jsonb, _meta_filters jsonb, _updated_by integer, tenant text DEFAULT '')
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
_rule_name text;
_temp_table text := gen_random_uuid();
_temp_table_2 text := gen_random_uuid();
_extra_paf_conditions_tenant_based text := '';
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
    where not is_deleted and is_default != true
    and module_code = '7001'
    group by is_deleted;
--    _query_pa := replace(REPLACE(_query_pa, '(rcl_dimension->>''', ''), ''')', '');

    -- Check if tenant is carters, then add extr filtering condition in paf
    IF tenant = 'carters' THEN
        _extra_paf_conditions_tenant_based := ' AND active_ladder_flg = true AND replenishment_status IN (''Laddering'', ''Laddering and Ordering'')';
    ELSE 
        _extra_paf_conditions_tenant_based := ' AND active and ordering = ''Y''';
    END IF;

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
        
        _temp_sql := 'CREATE TEMP TABLE "' || _temp_table || '" ON COMMIT DROP AS SELECT rcl_code, rule_code, min_replenishment_quantity, max_replenishment_quantity, order_multiple, moq_tolerance, level_of_application, ' || $5 || ' AS updated_by, MAX(created_at) created_at, MAX(created_by) created_by FROM inventory_smart.rcl_oms_constraint_master' ||  _where || ' group by 1,2,3,4,5,6,7;';
        RAISE NOTICE '_temp_sql: %', _temp_sql;
        EXECUTE _temp_sql;
    ELSE 
        _where := ' join (
        with paf as materialized(select rcl_hash from
                                    (
                                    select unnest(rcl_hashes) as rcl_hash from
                                        (
                                        select ' || _hash_cols || ' from global.product_attributes_filter ' || _pa_query || ' ' || _extra_paf_conditions_tenant_based || '
                                        )x 
                                    ) y where rcl_hash is not null group by 1
                                )
	        select rcl_code, rule_code,rule_name,md5(rcl_dimension::text) rcl_hash, rcl_dimension from inventory_smart.rcl_oms_constraint_master_rule where rcl_code = any(' || quote_literal(_rcl_codes::text) || '::int[]) and md5(rcl_dimension::text) 
                in (
                    select rcl_hash from paf
                    )
                    group by 1,2,3,4
                ) r on r.rule_code = c.rule_code and r.rcl_code = c.rcl_code ';

        _temp_sql := 'CREATE TEMP TABLE "' || _temp_table || '" ON COMMIT DROP AS SELECT c.rcl_code, c.rule_code, c.min_replenishment_quantity, c.max_replenishment_quantity, c.order_multiple, c.moq_tolerance, c.level_of_application, ' || $5 || ' AS updated_by, MAX(created_at) created_at, MAX(created_by) created_by FROM inventory_smart.rcl_oms_constraint_master c' || _where || _query_meta_filters || ' group by 1,2,3,4,5,6,7;';
        RAISE NOTICE '_temp_sql: %', _temp_sql;
        EXECUTE _temp_sql;
    END IF;
    

    -- Check if any size-based rules are being updated with "Sum of All" level of application
    DECLARE
        has_size_rules BOOLEAN;
    BEGIN
        FOR _set IN SELECT * FROM jsonb_array_elements($3) LOOP
            IF (_set ? 'level_of_application') AND (_set->>'level_of_application' = 'sum_all') THEN
                -- Check if any of the user-modified rules have size dimension
                _temp_sql := '
                    WITH user_modified_rules AS (
                        SELECT t.rule_code, t.rcl_code
                        FROM "' || _temp_table || '" t
                    ),
                    size_rules AS (
                        SELECT r.rule_code
                        FROM user_modified_rules umr
                        JOIN inventory_smart.rcl_oms_constraint_master_rule r 
                        ON r.rule_code = umr.rule_code AND r.rcl_code = umr.rcl_code
                        WHERE r.rcl_dimension::jsonb ? ''size''
                    )
                    SELECT COUNT(*) > 0 AS has_size_rules FROM size_rules;
                ';
                
                EXECUTE _temp_sql INTO has_size_rules;
                    
                IF has_size_rules THEN
                    RAISE EXCEPTION 'Save failed due to validation on level of application.';
                END IF;
            END IF;
            
            IF (_set->>'rule_name') IS NOT NULL THEN
                _rule_name := _set->>'rule_name';

                _temp_sql := 'UPDATE inventory_smart.rcl_oms_constraint_master_rule
                            SET rule_name = ' || quote_literal(_rule_name) || '
                            WHERE (rule_code, rcl_code) IN (SELECT rule_code, rcl_code FROM "' || _temp_table || '")';
                RAISE NOTICE 'Update rule_name query: %', _temp_sql;
                EXECUTE _temp_sql;
            END IF;
            EXIT; -- Only need to check once since we're validating the entire operation
        END LOOP;
    END;
    
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
                            else 'NULL' end || ')::int as min_replenishment_quantity,
                        (' || case when (_set ? 'max_replenishment_quantity') and (_set->>'max_replenishment_quantity' is null) then 'NULL' 
                            when _set ? 'max_replenishment_quantity' then quote_literal(_set->>'max_replenishment_quantity')
                            else 'NULL' end || ')::int as max_replenishment_quantity,
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
                    
                    -- Add error handling for the INSERT statement
                    BEGIN
                        _temp_sql := 'INSERT INTO inventory_smart.rcl_oms_constraint_master
                        (rcl_code, rule_code, min_replenishment_quantity, max_replenishment_quantity, order_multiple, moq_tolerance, level_of_application, created_by, created_at, updated_by, updated_at)
                        SELECT 
                            x.rcl_code, 
                            x.rule_code, 
                            CASE 
                                WHEN y.min_replenishment_quantity IS NOT NULL THEN y.min_replenishment_quantity
                                WHEN x.min_replenishment_quantity IS NOT NULL THEN x.min_replenishment_quantity
                                ELSE 1
                            END AS min_replenishment_quantity, 
                            CASE 
                                WHEN y.max_replenishment_quantity IS NOT NULL THEN y.max_replenishment_quantity
                                WHEN x.max_replenishment_quantity IS NOT NULL THEN x.max_replenishment_quantity
                                ELSE 99999
                            END AS max_replenishment_quantity, 
                            CASE 
                                WHEN y.order_multiple IS NOT NULL THEN y.order_multiple
                                WHEN x.order_multiple IS NOT NULL THEN x.order_multiple
                                ELSE 1
                            END AS order_multiple, 
                            CASE 
                                WHEN y.moq_tolerance IS NOT NULL THEN y.moq_tolerance
                                WHEN x.moq_tolerance IS NOT NULL THEN x.moq_tolerance
                                ELSE 0.5
                            END AS moq_tolerance, 
                            CASE 
                                WHEN y.level_of_application IS NOT NULL THEN y.level_of_application
                                WHEN x.level_of_application IS NOT NULL THEN x.level_of_application
                                ELSE ''sum_all''
                            END AS level_of_application, 
                            x.created_by, 
                            x.created_at, 
                            x.updated_by, 
                            NOW() AS updated_at
                        FROM "' || _temp_table || '" x
                        CROSS JOIN "' || _temp_table_2 || '" y;';
                        execute _temp_sql;
                        raise notice 'insert query: %', _temp_sql;
                    EXCEPTION WHEN OTHERS THEN
                        RAISE EXCEPTION 'Error executing INSERT statement: %. SQL: %', SQLERRM, _temp_sql;
                    END;
                    end loop;


end
$function$
;