--liquibase formatted sql
--changeset tarunreddy.challa:oms_update_rcl_create_constraints runOnChange:true stripComments:false splitStatements:false context:intial labels:oms_update_rcl_create_constraints
--comment: intial changeset for oms_update_rcl_create_constraints
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.oms_update_rcl_create_constraints(_persisted_temp_tbl_name text, _select jsonb, _value jsonb, _search_meta jsonb, _created_by integer);
CREATE OR REPLACE FUNCTION inventory_smart.oms_update_rcl_create_constraints(_persisted_temp_tbl_name text, _select jsonb, _value jsonb, _search_meta jsonb, _created_by integer)
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
/*s
Description: Inputs: $1 = set all/ selections values, $2 = product filters, $3 = store filters, $4 = new values for the filters, $5 = meta filters, $6 = created by.
This sp is used to update the base table directly. 
ample call: select * from inventory_smart.update_rcl_constraints('[{"rule_code":2}, {"rule_code":3}]', '{}'::jsonb,
'{ "created_at":"2024-05-20", "validity":"{[2024-09-01,2024-10-31]}","created_by":1,"level_of_application":"applicable_all"}'::jsonb, '{}'::jsonb, 99);
*/
begin
    _query_meta_filters := inventory_smart.form_rcl_table_query(_search_meta);
    IF jsonb_array_length($2) > 0 THEN
        FOR _set IN SELECT * FROM jsonb_array_elements($2) LOOP
            FOR _key, _value IN SELECT * FROM jsonb_each_text(_set) LOOP 
                _con := array_append(_con,  _key || ' = ' || quote_literal(_value));
                RAISE NOTICE '_con: %', _con;
            END LOOP;
            _final := array_append(_final, '(' || array_to_string(_con, ' AND ') ||')');
            _con := '{}';
        END LOOP;
       
        IF cardinality(_final) > 0 THEN
            _where := ' WHERE ' || array_to_string(_final, ' OR ');
        END IF;
        RAISE NOTICE 'where: %', _where;
        
        _temp_sql := 'CREATE TEMP TABLE "' || _temp_table || '" on commit drop AS SELECT rcl_code, rule_code, ' || $5 || ' as created_by, (array_agg(rcl_dimension))[1] rcl_dimension FROM public.'  || $1 || _where || ' group by 1,2,3;';
        RAISE NOTICE '_temp_sql: %', _temp_sql;
        EXECUTE _temp_sql;
           
    ELSE
        _temp_sql := 'CREATE TEMP TABLE "' || _temp_table || '" on commit drop AS SELECT rcl_code, rule_code, ' || $5 || ' AS created_by, (array_agg(rcl_dimension))[1] rcl_dimension FROM public.'  || $1 || _query_meta_filters ||' group by 1,2,3;';
        RAISE NOTICE '_temp_sql: %', _temp_sql;
        EXECUTE _temp_sql;
    END IF;

    -- Delete from persistent table --
    _temp_sql := 'DELETE FROM public.' || $1 || ' WHERE (rule_code) IN (SELECT rule_code FROM "' ||_temp_table || '");';
    RAISE NOTICE 'delete: %', _temp_sql;
    EXECUTE _temp_sql;
   
   FOR _set IN SELECT * FROM jsonb_array_elements($3) LOOP
       raise notice '_set: %', _set;
        execute 'drop table if exists "' || _temp_table_2 || '";';
      _temp_sql := 'create temp table "' || _temp_table_2 || '" as
                    select 
                        (' || case when _set->>'min_replenishment_quantity' is null then 'NULL' else quote_literal(_set->>'min_replenishment_quantity') end || ')::float4 as min_replenishment_quantity,
                        (' || case when _set->>'max_replenishment_quantity' is null then 'NULL' else quote_literal(_set->>'max_replenishment_quantity') end || ')::float4 as max_replenishment_quantity,
                        (' || case when _set->>'order_multiple' is null then 'NULL' else quote_literal(_set->>'order_multiple') end || ')::int as order_multiple,
                        (' || case when _set->>'moq_tolerance' is null then 'NULL' else quote_literal(_set->>'moq_tolerance') end || ')::float4 as moq_tolerance, 
                        (' || case when _set->>'level_of_application' is null then 'NULL' else quote_literal(_set->>'level_of_application') end || ')::varchar as level_of_application';
                execute _temp_sql;
                    raise notice 'create temp table 2: %', _temp_sql;
                    _temp_sql := 'INSERT INTO public.' || $1 || '
                    (rcl_code, rule_code, rcl_dimension, min_replenishment_quantity, max_replenishment_quantity, order_multiple, moq_tolerance, level_of_application, created_by, created_at)
                    select x.rcl_code, x.rule_code, x.rcl_dimension, y.min_replenishment_quantity, y.max_replenishment_quantity, y.order_multiple, y.moq_tolerance, y.level_of_application, x.created_by, now()  from "' || _temp_table || '" x cross join "' || _temp_table_2 || '" y;';
            execute _temp_sql;
                raise notice 'insert query: %', _temp_sql;
                    end loop;
END;
$function$
;