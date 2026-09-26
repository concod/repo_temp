--liquibase formatted sql
--changeset shashwat.yadav:rcl_create_network_save runOnChange:true stripComments:false splitStatements:false context:MTP-74818 labels:MTP-74818
--comment: MTP-74818 Used to save rcl network, updating updated_by and updated_at while adding hierarchy
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.rcl_create_network_save(text, jsonb, int4);
CREATE OR REPLACE FUNCTION inventory_smart.rcl_create_network_save(_temp_tbl_name text, _hierarchy jsonb, _module_code integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare 
    _item text;
    _rule_code_update_sql text;
    _insert_master text;
    _rcl_code int;
    _level varchar;
    _priority text;
    _cb text;
    _validity daterange;
   	_lvl varchar[];
   	counter  int = 0;
  	_rule_codes text[];
 	_priorities text[];
	v_gen_random_uuid text  := gen_random_uuid()::varchar;
	_max_validity text;
	_min_validity text;
 
begin

	_lvl := array_agg(_vals)
	    from
	    jsonb_object_keys(_hierarchy) as _vals;
	    raise notice '_lvl: %', _lvl;
	
	_level := (jsonb_agg(unnest
	    order by
	    unnest)::text)
	    from
	    unnest(_lvl) as unnest;

   
	_cb := '(select rcl_priority from global.rcl_priority_mapping where (select (jsonb_agg(unnest order by unnest)::text) from unnest(level) as unnest) = ' || quote_literal(_level) || ' and module_code = ' || _module_code || ')';
	        raise notice 'priority: %', _cb;
	    execute _cb into
	        _priority;
	    raise notice 'priority: %', _priority;

	_cb := '(select max(created_by) from public.' || _temp_tbl_name || ')';
    
	execute '(select daterange(min(lower(validity)), max(upper(validity)+1)) from public.' || _temp_tbl_name || ')' into _validity;
    raise notice 'validity: %', _validity;
   
    --insert into rcl_master
  	execute 'select array_agg(priority) from global.rcl_master where not is_deleted and module_code = ' || _module_code into _priorities;
	if _priority not in (select unnest(_priorities)) or _priority is null then
	    _insert_master := 'insert into global.rcl_master(rcl_code, module_code, level, hierarchy_selections, validity, priority, is_deleted, created_by, created_at) 
	                        values(nextval(''global.rcl_master_rcl_code_seq''), ' || $3 || ', ' || quote_literal(_lvl) || ', ' || quote_literal($2) || ', ' || quote_literal(datemultirange(_validity)) || ', ' || _priority || ', ' || 'false' || ', ' || _cb || ', ' || quote_literal(now()) || ')
							returning rcl_code;';
	    raise notice 'insert master: %',_insert_master;
	   	execute _insert_master into _rcl_code;
    else
        execute 'update global.rcl_master set updated_at = ' || quote_literal(now()) || ', updated_by = ' || _cb || ' where not is_deleted and module_code = ' || _module_code || ' and priority = ' || _priority || ' ;';
        _insert_master := 'select rcl_code from global.rcl_master where not is_deleted and module_code = ' || _module_code || ' and priority = ' || _priority || ' ;';
        execute _insert_master into _rcl_code;
    end if;
  
    --  insert into rule table
    execute 'select array_agg(rule_code) from public.' || _temp_tbl_name into _rule_codes;
    _insert_master := 'insert into inventory_smart.rcl_network_rule(rcl_code, rule_code, rcl_dimension, rule_name) 
						select distinct ' || _rcl_code || ',  case when temp.rule_code is null then rule.rule_code else temp.rule_code end as rule_code , rcl_dimension, temp.rule_name from public.' || _temp_tbl_name || ' temp
                        left join inventory_smart.rcl_network_rule rule using(rcl_code,rcl_dimension) where validity is not null
						on conflict(rcl_code, rcl_dimension) do update set rule_code = excluded.rule_code;';
    raise notice 'insert rule: %', _insert_master;
    execute _insert_master;

  	-- insert into master table
  	_insert_master := '
						insert into 
						inventory_smart.rcl_network_master(
						rcl_code, rule_code, validity, supply_network,
						created_at, created_by ) select ' || _rcl_code || ',  
						rule_code, validity, supply_network, created_at, created_by 
						from public.' || _temp_tbl_name || ' where validity is not null;';
    raise notice 'insert base: %', _insert_master;
	execute _insert_master;

	execute 'select  min(lower(validity)), max(upper(validity)) from inventory_smart.rcl_network_master where rcl_code = ' || _rcl_code || ';' into _min_validity, _max_validity;
	execute'update global.rcl_master set validity = datemultirange(daterange(' || quote_literal(_min_validity) || '::date, ' || quote_literal(_max_validity) || '::date)) where rcl_code = ' || _rcl_code || ';';

END;
$function$
;
