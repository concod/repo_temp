--liquibase formatted sql
--changeset liquibase:update_rcl_create_configuration runOnChange:true stripComments:false splitStatements:false context:MTP-38503 labels:MTP-38503
--comment: MTP-38503 Used to set values and save rcl rules
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.update_rcl_create_configuration(_persisted_temp_tbl_name text, _select jsonb, _value jsonb, _search_meta jsonb, _created_by integer);
CREATE OR REPLACE FUNCTION inventory_smart.update_rcl_create_configuration(_persisted_temp_tbl_name text, _select jsonb, _value jsonb, _search_meta jsonb, _created_by integer)
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

begin
	_query_meta_filters := inventory_smart.form_rcl_table_query(_search_meta);
	_query_meta_filters := replace(replace(_query_meta_filters, 'c_rule_code', 'rule_code'), 'c_rcl_code', 'rcl_code');
	RAISE NOTICE '_query_meta_filters: %', _query_meta_filters;	
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
        
        _temp_sql := 'CREATE TEMP TABLE "' || _temp_table || '" on commit drop AS SELECT rcl_code, rule_code, rule_name, rcl_dimension, ' || $5 || ' as  created_by FROM public.'  || $1 || _where || ' group by 1,2,3,4;';
        RAISE NOTICE '_temp_sql: %', _temp_sql;
        EXECUTE _temp_sql;
           
    ELSE
        _temp_sql := 'CREATE TEMP TABLE "' || _temp_table || '" on commit drop AS SELECT rcl_code, rule_code, rule_name, rcl_dimension, ' || $5 || ' AS  created_by FROM public.'  || $1 || _query_meta_filters || ' group by 1,2,3,4;';
        RAISE NOTICE '_temp_sql: %', _temp_sql;
        EXECUTE _temp_sql;
    END IF;

    -- Delete from persistent table --
    _temp_sql := 'DELETE FROM public.' || $1 || ' WHERE (rule_code) IN (SELECT rule_code FROM "' ||_temp_table || '");';
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
                        (' || case when _set->>'default_store_groups' is null then 'NULL' else quote_literal(_set->>'default_store_groups') end || ')::integer[] as default_store_groups,
						(' || case when _set->>'default_product_profile' is null then 'NULL' else quote_literal(_set->>'default_product_profile') end || ')::int4 as default_product_profile,
						(' || case when _set->>'auto_allocation_rule' is null then 'NULL' else quote_literal(_set->>'auto_allocation_rule') end || ')::int4 as auto_allocation_rule,
						(' || case when _set->>'auto_allocation_schedular' is null then 'NULL' else quote_literal(_set->>'auto_allocation_schedular') end || ')::int4 as auto_allocation_schedular,
						(' || case when _set->>'dc_store_rule' is null then 'NULL' else quote_literal(_set->>'dc_store_rule') end || ')::int4 as dc_store_rule,
						daterange(' || quote_literal(_set->>'start_date') || ', date(' || quote_literal(_set->>'end_date') || '::timestamp + interval ''1 day'')) as validity;';
       	execute _temp_sql;
		raise notice 'create temp table 2: %', _temp_sql;
		_temp_sql := 'INSERT INTO public.' || $1 || '
					(rcl_code, rule_code, rule_name, rcl_dimension, default_store_groups, default_product_profile, auto_allocation_rule, auto_allocation_schedular, dc_store_rule, created_by, created_at, validity)
					select x.rcl_code, x.rule_code, x.rule_name, x.rcl_dimension, y.default_store_groups, y.default_product_profile, y.auto_allocation_rule, y.auto_allocation_schedular, y.dc_store_rule, x.created_by, now(), y.validity from "' || _temp_table || '" x cross join "' || _temp_table_2 || '" y;';
		execute _temp_sql;
		raise notice 'insert query: %', _temp_sql;
		end loop;
END;
$function$
;
