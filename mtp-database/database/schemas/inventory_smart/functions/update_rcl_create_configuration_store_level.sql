--liquibase formatted sql
--changeset liquibase:update_rcl_create_configuration_store_level runOnChange:true stripComments:false splitStatements:false context:MTP-82235 labels:MTP-82235
--comment: MTP-82235 update store level configuration for rcl rules
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.update_rcl_create_configuration_store_level(_persisted_temp_tbl_name text, _select jsonb, _value jsonb, _search_meta jsonb, _created_by integer);
CREATE OR REPLACE FUNCTION inventory_smart.update_rcl_create_configuration_store_level(
_persisted_temp_tbl_name text, 
_select jsonb, 
_value jsonb, 
_search_meta jsonb, 
_created_by integer
)
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

begin
    RAISE NOTICE '_persisted_temp_tbl_name: %', _persisted_temp_tbl_name;
    RAISE NOTICE '_select: %', _select;
    RAISE NOTICE '_value: %', _value;
    RAISE NOTICE '_search_meta: %', _search_meta;
    RAISE NOTICE '_created_by: %', _created_by;
    RAISE NOTICE '_temp_table: %', _temp_table;
    RAISE NOTICE '_temp_table_2: %', _temp_table_2;
    
	_query_meta_filters := inventory_smart.form_rcl_table_query(_search_meta);
    RAISE NOTICE '_query_meta_filters: %', _query_meta_filters;
    
    IF jsonb_array_length($2) > 0 THEN
        RAISE NOTICE 'Processing _select array with length: %', jsonb_array_length($2);
        FOR _set IN SELECT * FROM jsonb_array_elements($2) LOOP
            RAISE NOTICE 'Processing _set from _select: %', _set;
            FOR _key, _value IN SELECT * FROM jsonb_each_text(_set) LOOP 
                RAISE NOTICE 'Processing key: %, value: %', _key, _value;
                IF _key = 'store_code' or _key = 'psa_code' THEN 
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

        -- why do we need created_by here?
        _temp_sql := 'CREATE TEMP TABLE "' || _temp_table || '" on commit drop AS SELECT rcl_code, rule_code, store_code, store_name, channel, ' || $5 || ' as  created_by FROM public.'  || $1 || '_store_level' || _where || ' group by 1,2,3,4,5;';
        RAISE NOTICE '_temp_sql: %', _temp_sql;
        EXECUTE _temp_sql;
           
    ELSE
        -- why is a temp table needed here?
        RAISE NOTICE 'No items in _select array, using search_meta filters';
        _temp_sql := 'CREATE TEMP TABLE "' || _temp_table || '" on commit drop AS SELECT rcl_code, rule_code, store_code, store_name, channel, ' || $5 || ' AS  created_by FROM public.'  || $1 || '_store_level' || _query_meta_filters || ' group by 1,2,3,4,5;';
        RAISE NOTICE '_temp_sql: %', _temp_sql;
        EXECUTE _temp_sql;
    END IF;

    -- Delete from persistent table --
    _temp_sql := 'DELETE FROM public.' || $1 || '_store_level' || ' WHERE (rule_code) IN (SELECT DISTINCT rule_code FROM "' ||_temp_table || '");';
    RAISE NOTICE 'delete: %', _temp_sql;
    EXECUTE _temp_sql;

    RAISE NOTICE 'Processing _value array with length: %', jsonb_array_length($3);
    FOR _set IN SELECT * FROM jsonb_array_elements($3) LOOP
       	RAISE NOTICE '_set from _value: %', _set;
        RAISE NOTICE 'default_store_groups: %', _set->>'default_store_groups';
        RAISE NOTICE 'default_product_profile: %', _set->>'default_product_profile';
        RAISE NOTICE 'auto_allocation_rule: %', _set->>'auto_allocation_rule';
        RAISE NOTICE 'auto_allocation_schedular: %', _set->>'auto_allocation_schedular';
		RAISE NOTICE 'auto_allocation_schedular_store_level: %', _set->>'auto_allocation_schedular_store_level';
        RAISE NOTICE 'dc_store_rule: %', _set->>'dc_store_rule';
        RAISE NOTICE 'start_date: %', _set->>'start_date';
        RAISE NOTICE 'end_date: %', _set->>'end_date';
        
		execute 'drop table if exists "' || _temp_table_2 || '";';

		IF _set->>'auto_allocation_schedular_store_level' IS NULL
		THEN 
	    	_temp_sql := 'create temp table "' || _temp_table_2 || '" as
			select 
				(' || case when _set->>'auto_allocation_schedular' is null then 'NULL' else quote_literal(_set->>'auto_allocation_schedular') end || ')::int4 as auto_allocation_schedular,
				daterange(' || quote_literal(_set->>'start_date') || ', date(' || quote_literal(_set->>'end_date') || '::timestamp + interval ''1 day'')) as validity;';
	       	EXECUTE _temp_sql;
			RAISE NOTICE 'create temp table 2: %',  _temp_sql;
			_temp_sql := 'INSERT INTO public.' || $1 || '_store_level' || '
						(rcl_code, rule_code, store_code, store_name, channel, auto_allocation_schedular, validity, created_by, created_at)
						select x.rcl_code, x.rule_code, x.store_code, x.store_name, x.channel, y.auto_allocation_schedular, y.validity, x.created_by, now() from "' || _temp_table || '" x cross join "' || _temp_table_2 || '" y;';
			RAISE NOTICE 'insert query: %', _temp_sql;
			EXECUTE _temp_sql;
			
		ELSE
			-- First, ensure we have the validity period calculated correctly
			_temp_sql := 'CREATE TEMP TABLE "' || _temp_table_2 || '" AS 
             SELECT 
               daterange(' || quote_literal(_set->>'start_date') || ', DATE(' || quote_literal(_set->>'end_date') || '::TIMESTAMP + INTERVAL ''1 day'')) AS validity,
               store_code, 
               (CASE WHEN auto_allocation_schedular IS NULL THEN NULL ELSE auto_allocation_schedular END) AS auto_allocation_schedular 
             FROM ( 
               SELECT 
                 (jsonb_array_elements(' || quote_literal(_set->>'auto_allocation_schedular_store_level') || '::jsonb)->>''store_code'') AS store_code, 
                 (jsonb_array_elements(' || quote_literal(_set->>'auto_allocation_schedular_store_level') || '::jsonb)->>''auto_allocation_schedular'')::int4 AS auto_allocation_schedular
             ) AS x;';
	       	RAISE NOTICE 'create temp table 2: %',  _temp_sql;
			EXECUTE _temp_sql;
			
			-- Create cross join between all stores and the validity period, then left join with specific scheduler values
			_temp_sql := 'INSERT INTO public.' || $1 || '_store_level' || '
						(rcl_code, rule_code, store_code, store_name, channel, auto_allocation_schedular, validity, created_by, created_at)
						SELECT 
							x.rcl_code, 
							x.rule_code, 
							x.store_code, 
							x.store_name, 
							x.channel, 
							COALESCE(y.auto_allocation_schedular, NULL) as auto_allocation_schedular, 
							v.validity, 
							x.created_by, 
							now() 
						FROM "' || _temp_table || '" x 
						CROSS JOIN (SELECT DISTINCT validity FROM "' || _temp_table_2 || '") v
						LEFT JOIN "' || _temp_table_2 || '" y ON x.store_code = y.store_code;';
			RAISE NOTICE 'insert query: %', _temp_sql;
			EXECUTE _temp_sql;
		END IF;
			
	END LOOP;
    
    RAISE NOTICE 'Function completed successfully.';
END;
$function$
;
