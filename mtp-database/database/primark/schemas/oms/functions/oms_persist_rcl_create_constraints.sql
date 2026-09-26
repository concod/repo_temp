--liquibase formatted sql
--changeset priyansh.gautam:oms_persist_rcl_create_constraints_update14 runOnChange:true stripComments:false splitStatements:false context:intial labels:oms_persist_rcl_create_constraints_update1
--comment: intial changeset for oms_persist_rcl_create_constraints update12
--rollback: SELECT 1
DROP FUNCTION IF EXISTS oms.oms_persist_rcl_create_constraints(_temp_tbl_name text, _module_code integer);
DROP FUNCTION IF EXISTS oms.oms_persist_rcl_create_constraints(_temp_tbl_name text, _hierarchy jsonb, _module_code integer);
CREATE OR REPLACE FUNCTION oms.oms_persist_rcl_create_constraints(_temp_tbl_name text, _hierarchy jsonb, _module_code integer)
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
    _rule_codes text[];
    _priorities text[];
begin
    _lvl := array_agg(_vals) from jsonb_object_keys(_hierarchy)as _vals;
    _level := (jsonb_agg(unnest order by unnest)::text) from unnest(_lvl) as unnest;
    
    _cb := '(select rcl_priority from global.rcl_priority_mapping where (select (jsonb_agg(unnest order by unnest)::text) from unnest(level) as unnest) = ' || quote_literal(_level) || ' and module_code = ' || _module_code || ')';
    execute _cb into _priority;

	_cb := '(select max(created_by) from public.' || _temp_tbl_name || ')';

    --execute '(select daterange(min(lower(validity)), max(upper(validity))) from public.' || _temp_tbl_name || ')' into _validity;
   
	execute 'select array_agg(priority) from global.rcl_master where not is_deleted and module_code = ' || _module_code into _priorities;
    
	if _priority not in (select unnest(_priorities)) or _priority is null then
    	_insert_master := 'insert into global.rcl_master(rcl_code, module_code, level, hierarchy_selections, validity, priority, is_deleted, created_by, created_at) 
                        values( nextval(''global.rcl_master_rcl_code_seq''), ' || $3 || ', ' || quote_literal(_lvl) || ', ' || quote_literal($2) || ', ''{[2024-01-01,2050-12-31)}'', ' || _priority || ', ' || 'false' || ', ' || _cb || ', ' || quote_literal(now()) || ')
                        returning rcl_code;';  
                       raise notice 'insert master: %',_insert_master;
                       execute _insert_master into _rcl_code;
    else
        execute 'update global.rcl_master set updated_at = ' || quote_literal(now()) || ', updated_by = ' || _cb || ' where not is_deleted and module_code = ' || _module_code || ' and priority = ' || _priority || ' ;';
        _insert_master := 'select rcl_code from global.rcl_master where not is_deleted and module_code = ' || _module_code || ' and priority = ' || _priority || ' ;';
        execute _insert_master into _rcl_code;
    end if;

    --  insert into rule table
--    execute 'select array_agg(rule_code) from public.' || _temp_tbl_name into _rule_codes;
    _insert_master := 'insert into oms.rcl_oms_constraint_master_rule(rcl_code, rule_code, rule_name, rcl_dimension) 
						select distinct ' || _rcl_code || ',  temp.rule_code, temp.rule_name, temp.rcl_dimension from public.' || _temp_tbl_name || ' temp
                        left join oms.rcl_oms_constraint_master_rule rule using(rcl_code,rcl_dimension) where level_of_application is not null
						on conflict(rcl_code, rcl_dimension) do update set rule_code = excluded.rule_code, rule_name = excluded.rule_name;';
					
    raise notice 'insert rule: %',
    _insert_master;

    execute _insert_master;

    --  insert into BASE table
    _insert_master := 'INSERT INTO oms.rcl_oms_constraint_master(rcl_code, rule_code, min_replenishment_quantity, max_replenishment_quantity, order_multiple, moq_tolerance, level_of_application, pack_selection, created_at, created_by) 
                        SELECT ' || _rcl_code || ', 
                               rule_code, 
                               COALESCE(min_replenishment_quantity, 1), 
                               COALESCE(max_replenishment_quantity, 99999), 
                               COALESCE(order_multiple, 1), 
                               COALESCE(moq_tolerance, 0.5), 
                               level_of_application,
                               pack_selection,
                               now(),
                               created_by 
                        FROM public.' || _temp_tbl_name || ' 
                        WHERE level_of_application IS NOT NULL;';
    raise notice 'insert base: %', _insert_master;

    execute _insert_master;
end;
$function$
;
