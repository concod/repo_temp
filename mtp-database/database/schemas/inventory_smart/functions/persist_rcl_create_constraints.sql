--liquibase formatted sql
--changeset linu.nazil:persist_rcl_create_constraints runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for persist_rcl_create_constraints
--rollback: SELECT 1
--this function is to persist all the new entries from temp table to rcl_master, rule and constraint table. this is executed after rcl_create_constraints and update_rcl_create_constraints;
DROP FUNCTION IF EXISTS inventory_smart.persist_rcl_create_constraints(_temp_tbl_name text, _hierarchy jsonb, module_code int4);
CREATE OR REPLACE FUNCTION inventory_smart.persist_rcl_create_constraints(
	_temp_tbl_name TEXT, 	
	_hierarchy 	   JSONB, 
	_module_code   INTEGER
)
RETURNS VOID AS 
$function$
DECLARE 
    _rcl_code INT;
    _lvl varchar[];
    _level varchar;
    _priority text;
    _created_by text;
    _validity daterange;
    _priorities text[];
	_max_validity text;
    _min_validity text;
begin
    _lvl := array_agg(_vals) from jsonb_object_keys(_hierarchy)as _vals;
    _level := (jsonb_agg(unnest order by unnest)::text) from unnest(_lvl) as unnest;
    
    execute '(select rcl_priority from global.rcl_priority_mapping where (select (jsonb_agg(unnest order by unnest)::text) from unnest(level) as unnest) = ' || quote_literal(_level) || ' and module_code = ' || _module_code || ')' into _priority;
	if  _priority is null then
		raise exception 'Priority value is not predefined for the selected product hierarchy combination: %', _level;
	end if;

	execute '(select created_by from public.' || _temp_tbl_name || ' limit 1)' into _created_by;

    execute '(select daterange(min(lower(validity)), max(upper(validity)+1)) from public.' || _temp_tbl_name || ')' into _validity;
   
	execute 'select array_agg(priority) from global.rcl_master where not is_deleted and module_code = ' || _module_code into _priorities;
    

	if _priority = any(_priorities) then
		execute 'update global.rcl_master set updated_at = ' || quote_literal(now()) || ', updated_by = ' || _created_by || ' where not is_deleted and module_code = ' || _module_code || ' and priority = ' || _priority || ' returning rcl_code;' into _rcl_code; 
    else
    	execute 'insert into global.rcl_master(rcl_code, module_code, level, hierarchy_selections, validity, priority, is_deleted, created_by, created_at) 
                        values( nextval(''global.rcl_master_rcl_code_seq''), ' || $3 || ', ' || quote_literal(_lvl) || ', ' || quote_literal($2) || ', ' || quote_literal(datemultirange(_validity)) || ', ' || _priority || ', ' || 'false' || ', ' || _created_by || ', ' || quote_literal(now()) || ')
                        returning rcl_code;' into _rcl_code;  
    end if;

    execute 'delete from inventory_smart.rcl_constraint_master c
    using inventory_smart.rcl_constraint_master_rule r
    where  r.rcl_code = c.rcl_code and r.rule_code = c.rule_code 
    and r.rcl_dimension in (select rcl_dimension from ' || _temp_tbl_name || ') and  upper(validity) < current_date;';

    execute 'delete from inventory_smart.rcl_constraint_master_rule r where not exists (select 1 from inventory_smart.rcl_constraint_master c
    where  r.rcl_code = c.rcl_code and r.rule_code = c.rule_code);';

	execute 'insert into inventory_smart.rcl_constraint_master_rule(rcl_code, rule_code, rcl_dimension, rule_name, store_hierarchy_level) 
					   select distinct ' || _rcl_code || ',  rule_code, rcl_dimension, rule_name, store_hierarchy_level
					   from public.' || _temp_tbl_name || '
                       where rcl_dimension not in (
							select rcl_dimension 
							 from inventory_smart.rcl_constraint_master_rule r
							 join inventory_smart.rcl_constraint_master c 
							 on r.rcl_code = c.rcl_code and 
							 r.rule_code = c.rule_code and 
							 not is_deleted and 
							 upper(validity) > current_date
						) and 
						validity is not null ;';

    execute 'insert into inventory_smart.rcl_constraint_master(rcl_code, rule_code, psa_code, validity, wos, dos, min_stock, min_distribution, max_stock, created_at, created_by) select ' || _rcl_code || ',  rule_code, psa_code, validity, wos, dos, min_stock, min_distribution, max_stock, created_at, created_by from public.' || _temp_tbl_name || ' where validity is not null;';


	execute 'select  min(lower(validity)), max(upper(validity)) from inventory_smart.rcl_constraint_master where rcl_code = ' || _rcl_code || ';' into _min_validity, _max_validity;
	execute'update global.rcl_master set validity = datemultirange(daterange(' || quote_literal(_min_validity) || '::date, ' || quote_literal(_max_validity) || '::date)) where rcl_code = ' || _rcl_code || ';';
end;
$function$
LANGUAGE plpgsql;