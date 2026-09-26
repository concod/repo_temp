--liquibase formatted sql
--changeset linu.nazil:persist_rcl_create_constraints runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for persist_rcl_create_constraints
--rollback: SELECT 1
--this function is to persist all the new entries from temp table to rcl_master, rule and constraint table. this is executed after rcl_create_constraints and update_rcl_create_constraints;
drop function if exists inventory_smart.persist_rcl_create_constraints(_temp_tbl_name text, _hierarchy jsonb, module_code int4);
CREATE OR REPLACE FUNCTION inventory_smart.persist_rcl_create_constraints(_temp_tbl_name text, _hierarchy jsonb, _module_code integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare 
    _item text;
    _insert_master text;
    _rcl_code int;
    _lvl varchar[];
    _level varchar;
    _priority text;
    _cb text;
    _validity daterange;
    _rule_codes text;
    _priorities text[];
	_max_validity text;
    _min_validity text;
begin
    _lvl := array_agg(_vals) from jsonb_object_keys(_hierarchy)as _vals;
    _level := (jsonb_agg(unnest order by unnest)::text) from unnest(_lvl) as unnest;
    
    _cb := '(select rcl_priority from global.rcl_priority_mapping where (select (jsonb_agg(unnest order by unnest)::text) from unnest(level) as unnest) = ' || quote_literal(_level) || ' and module_code = ' || _module_code || ')';
    execute _cb into _priority;

	_cb := '(select max(created_by) from public.' || _temp_tbl_name || ')';

    execute '(select daterange(min(lower(validity)), max(upper(validity)+1)) from public.' || _temp_tbl_name || ')' into _validity;
   
	execute 'select array_agg(priority) from global.rcl_master where not is_deleted and module_code = ' || _module_code into _priorities;
    
	if _priority not in (select unnest(_priorities)) or _priority is null then
    	_insert_master := 'insert into global.rcl_master(rcl_code, module_code, level, hierarchy_selections, validity, priority, is_deleted, created_by, created_at) 
                        values( nextval(''global.rcl_master_rcl_code_seq''), ' || $3 || ', ' || quote_literal(_lvl) || ', ' || quote_literal($2) || ', ' || quote_literal(datemultirange(_validity)) || ', ' || _priority || ', ' || 'false' || ', ' || _cb || ', ' || quote_literal(now()) || ')
                        returning rcl_code;';  
                       raise notice 'insert master: %',_insert_master;
                       execute _insert_master into _rcl_code;
    else
        execute 'update global.rcl_master set updated_at = ' || quote_literal(now()) || ', updated_by = ' || _cb || ' where not is_deleted and module_code = ' || _module_code || ' and priority = ' || _priority || ' ;';
        _insert_master := 'select rcl_code from global.rcl_master where not is_deleted and module_code = ' || _module_code || ' and priority = ' || _priority || ' ;';
        execute _insert_master into _rcl_code;
        execute 'select string_agg(distinct rule_code::text, '','')
				from
					inventory_smart.rcl_constraint_master_rule
				where
				rcl_dimension in (select rcl_dimension from public.' || _temp_tbl_name || ' where existing_rule is null);' into _rule_codes;
    end if;

    --  insert into rule table
    -- execute 'delete from inventory_smart.rcl_constraint_master_rule where rule_code not in (select rule_code from inventory_smart.rcl_constraint_master) and rcl_dimension in (select distinct rcl_dimension from public.' || _temp_tbl_name || ');';

	if _rule_codes is not null then
		execute 'delete from inventory_smart.rcl_constraint_master where rule_code in (' || _rule_codes ||');';
		execute 'delete from inventory_smart.rcl_constraint_master_rule where rule_code in (' || _rule_codes ||');';
	end if;

	_insert_master := 'insert into inventory_smart.rcl_constraint_master_rule(rcl_code, rule_code, rcl_dimension, rule_name) select distinct ' || _rcl_code || ',  rule_code, rcl_dimension, rule_name from public.' || _temp_tbl_name || '
                        where rcl_dimension not in (select rcl_dimension from inventory_smart.rcl_constraint_master_rule r
													join inventory_smart.rcl_constraint_master c on r.rcl_code = c.rcl_code and r.rule_code = c.rule_code and not is_deleted and upper(validity) > current_date) and validity is not null ;';
    execute _insert_master;

    --  insert into BASE table
    _insert_master := 'insert into inventory_smart.rcl_constraint_master(rcl_code, rule_code, psa_code, psa_name, validity, wos, min_stock, max_stock, created_at, created_by) select ' || _rcl_code || ',  rule_code, psa_code, psa_name, validity, wos, min_stock, max_stock, created_at, created_by from public.' || _temp_tbl_name || ' where validity is not null;';
    execute _insert_master;

	execute 'select  min(lower(validity)), max(upper(validity)) from inventory_smart.rcl_constraint_master where rcl_code = ' || _rcl_code || ';' into _min_validity, _max_validity;
	execute'update global.rcl_master set validity = datemultirange(daterange(' || quote_literal(_min_validity) || '::date, ' || quote_literal(_max_validity) || '::date)) where rcl_code = ' || _rcl_code || ';';
end;
$function$
;