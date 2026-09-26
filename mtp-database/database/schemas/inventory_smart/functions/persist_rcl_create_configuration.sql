--liquibase formatted sql
--changeset liquibase:persist_rcl_create_configuration runOnChange:true stripComments:false splitStatements:false context:MTP-112857 labels:MTP-112857
--comment: MTP-112857 po store policy flow
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.persist_rcl_create_configuration(text, jsonb, int4);
DROP FUNCTION IF EXISTS inventory_smart.persist_rcl_create_configuration(text, jsonb, int4, bool);
CREATE OR REPLACE FUNCTION inventory_smart.persist_rcl_create_configuration(
	_temp_tbl_name text, 
	_hierarchy jsonb, 
	_module_code integer,
	_is_rule_store_level_configuration boolean default false,
	_config jsonb default '{}'::jsonb
)
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
	_store_level_temp_table text;
	_rcl_store_policy_table text;
	_rcl_store_policy_rule_table text;
 
begin
	-- Extract values from _config
	_rcl_store_policy_table := COALESCE(_config->>'rcl_store_policy_table', 'inventory_smart.rcl_dc_store_policy');
	_rcl_store_policy_rule_table := COALESCE(_config->>'rcl_store_policy_rule_table', 'inventory_smart.rcl_dc_store_policy_rule');

	-- Create the store level temp table name by adding _store_code suffix
	_store_level_temp_table := _temp_tbl_name || '_store_level';

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
		perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.persist_rcl_create_configuration', 'Before executing _cb into priority block',_cb ,jsonb_build_object('_temp_tbl_name',_temp_tbl_name,'_hierarchy',_hierarchy,'_module_code',_module_code)) ;		
	    execute _cb into
	        _priority;
	    raise notice 'priority: %', _priority;

	_cb := '(select max(created_by) from public.' || _temp_tbl_name || ')';
   
	perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.persist_rcl_create_configuration', 'Before executing max and min validity into validity block','(select daterange(min(lower(validity)), max(upper(validity))) from public.' || _temp_tbl_name || ')' ,jsonb_build_object('_temp_tbl_name',_temp_tbl_name,'_hierarchy',_hierarchy,'_module_code',_module_code)) ;		
	execute '(select daterange(min(lower(validity)), max(upper(validity)+1)) from public.' || _temp_tbl_name || ')' into _validity;
    raise notice 'validity: %', _validity;
   
    --insert into rcl_master
	perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.persist_rcl_create_configuration', 'Before executing array_agg(priority) into _priorities block','select array_agg(priority) from global.rcl_master where not is_deleted and module_code = ' || _module_code,jsonb_build_object('_temp_tbl_name',_temp_tbl_name,'_hierarchy',_hierarchy,'_module_code',_module_code)) ;		
  	execute 'select array_agg(priority) from global.rcl_master where not is_deleted and module_code = ' || _module_code into _priorities;
	if _priority not in (select unnest(_priorities)) or _priority is null then
	    _insert_master := 'insert into global.rcl_master(rcl_code, module_code, level, hierarchy_selections, validity, priority, is_deleted, created_by, created_at)
	                        values(nextval(''global.rcl_master_rcl_code_seq''), ' || $3 || ', ' || quote_literal(_lvl) || ', ' || quote_literal($2) || ', ' || quote_literal(datemultirange(_validity)) || ', ' || _priority || ', ' || 'false' || ', ' || _cb || ', ' || quote_literal(now()) || ')
							returning rcl_code;';
	    raise notice 'insert master: %',_insert_master;
		perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.persist_rcl_create_configuration', 'Before executing _insert_master into _rcl_code block',_insert_master,jsonb_build_object('_temp_tbl_name',_temp_tbl_name,'_hierarchy',_hierarchy,'_module_code',_module_code)) ;		
	   	execute _insert_master into _rcl_code;
    else
		perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.persist_rcl_create_configuration', 'Before  updating rcl_master block','update global.rcl_master set updated_at = ' || quote_literal(now()) || ', updated_by = ' || _cb || ' where not is_deleted and module_code = ' || _module_code || ' and priority = ' || _priority || ' ;',jsonb_build_object('_temp_tbl_name',_temp_tbl_name,'_hierarchy',_hierarchy,'_module_code',_module_code)) ;		
        execute 'update global.rcl_master set updated_at = ' || quote_literal(now()) || ', updated_by = ' || _cb || ' where not is_deleted and module_code = ' || _module_code || ' and priority = ' || _priority || ' ;';
        _insert_master := 'select rcl_code from global.rcl_master where not is_deleted and module_code = ' || _module_code || ' and priority = ' || _priority || ' ;';
		perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.persist_rcl_create_configuration', 'Before executing _insert_master into _rcl_code block',_insert_master,jsonb_build_object('_temp_tbl_name',_temp_tbl_name,'_hierarchy',_hierarchy,'_module_code',_module_code)) ;		
        execute _insert_master into _rcl_code;
    end if;
  
    --  insert into rule table
	perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.persist_rcl_create_configuration', 'Before executing array_agg(rule_code) into _rule_codes block','select array_agg(rule_code) from public.' || _temp_tbl_name,jsonb_build_object('_temp_tbl_name',_temp_tbl_name,'_hierarchy',_hierarchy,'_module_code',_module_code)) ;		
    execute 'select array_agg(rule_code) from public.' || _temp_tbl_name into _rule_codes;
    _insert_master := 'insert into ' || _rcl_store_policy_rule_table || '(rcl_code, rule_code, rcl_dimension, rule_name)
						select distinct ' || _rcl_code || ',  case when temp.rule_code is null then rule.rule_code else temp.rule_code end as rule_code , rcl_dimension, temp.rule_name from public.' || _temp_tbl_name || ' temp
                        left join ' || _rcl_store_policy_rule_table || ' rule using(rcl_code,rcl_dimension) where validity is not null
						on conflict(rcl_code, rcl_dimension) do update set rule_code = excluded.rule_code;';
    raise notice 'insert rule: %', _insert_master;
	perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.persist_rcl_create_configuration', 'Before inserting into  rcl_dc_store_policy_rule ',_insert_master,jsonb_build_object('_temp_tbl_name',_temp_tbl_name,'_hierarchy',_hierarchy,'_module_code',_module_code)) ;		
    execute _insert_master;

  	-- insert into BASE table
  	_insert_master := '
						insert into 
						' || _rcl_store_policy_table || '(
						rcl_code, rule_code, validity, default_store_groups, 
						default_product_profile, auto_allocation_rule, auto_allocation_schedular,
						dc_store_rule, created_at, created_by ) select ' || _rcl_code || ',  
						rule_code, validity, default_store_groups, default_product_profile,
						auto_allocation_rule, auto_allocation_schedular, dc_store_rule, created_at, created_by 
						from public.' || _temp_tbl_name || ' where validity is not null;';
    raise notice 'insert base: %', _insert_master;
	perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.persist_rcl_create_configuration', 'Before inserting into  rcl_dc_store_policy ',_insert_master,jsonb_build_object('_temp_tbl_name',_temp_tbl_name,'_hierarchy',_hierarchy,'_module_code',_module_code)) ;		
	execute _insert_master;
	
	-- Check if store level configuration is enabled
	perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.persist_rcl_create_configuration', 'Checking if store level configuration is enabled', '_is_rule_store_level_configuration: ' || _is_rule_store_level_configuration, jsonb_build_object('_is_rule_store_level_configuration', _is_rule_store_level_configuration));
	
	IF _is_rule_store_level_configuration THEN
		-- Insert into store level policy table
		_insert_master := '
						insert into 
						inventory_smart.rcl_dc_store_policy_store_level(
						rcl_code, rule_code, validity, store_code, store_name, channel,
						auto_allocation_schedular, created_at, created_by ) select ' || _rcl_code || ',  
						rule_code, validity, store_code, store_name, channel,
						auto_allocation_schedular, created_at, created_by 
						from public.' || _store_level_temp_table || ' where validity is not null;';
		raise notice 'insert store level: %', _insert_master;
		perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.persist_rcl_create_configuration', 'Before inserting into rcl_dc_store_policy_store_level', _insert_master, jsonb_build_object('_store_level_temp_table', _store_level_temp_table, '_rcl_code', _rcl_code));
		execute _insert_master;
	END IF;

	execute 'select  min(lower(validity)), max(upper(validity)) from ' || _rcl_store_policy_table || ' where rcl_code = ' || _rcl_code || ';' into _min_validity, _max_validity;
	execute'update global.rcl_master set validity = datemultirange(daterange(' || quote_literal(_min_validity) || '::date, ' || quote_literal(_max_validity) || '::date)) where rcl_code = ' || _rcl_code || ';';

	END;
$function$
;