--liquibase formatted sql
--changeset liquibase:migrate_plan_attr runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-21318
--comment: One time Run SP to add a new plan attr
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.migrate_plan_attr();
CREATE OR REPLACE FUNCTION inventory_smart.migrate_plan_attr()
 RETURNS TABLE(allocation_code character varying)
 LANGUAGE plpgsql
AS $function$
/**
 * Function adds plan attr = total_allocated to all finalized plans
 *  Syntax :- 
		 select * from inventory_smart.migrate_plan_attr();

 */
	declare
	_insert_plan_attr text;
	_plan_list text[];
	_ret_query text;
	_plan text;
	_plan_list_insert text;
	begin
		_insert_plan_attr := '';
		 execute 'SELECT array_agg(plan_code) FROM "inventory_smart".plan_master where status=3 and is_deleted=false ;' 
	     into _plan_list;
		
		foreach _plan in array _plan_list loop 
			_insert_plan_attr := CONCAT(_insert_plan_attr,  '
						DELETE FROM "inventory_smart".plan_attributes where plan_code ='''||_plan||''' 
							and attribute_name = ''total_allocated'';
						-- Deleting to maintain idempotency and making this reusable

						INSERT INTO "inventory_smart".plan_attributes (plan_code, attribute_name, attribute_value) values ('''||_plan||''',''total_allocated'',
						(
						select
							sum(allocated_total) as total
						from
							inventory_smart.create_allocation_result_flat_gurobi carfg
						where
							allocation_code = '''||_plan||''') 
						) ; 
						');
		end loop;
			execute _insert_plan_attr;
		_plan_list_insert := '
			DELETE FROM inventory_smart.plan_attributes_list
			WHERE attribute_name=''total_allocated'';

			INSERT INTO inventory_smart.plan_attributes_list
			(attribute_name, is_hierarchy, is_attribute, is_main_col, hierarchy_level, "datatype")
			VALUES(''total_allocated'', false, false, false, 28, ''int'');
			';
		execute _plan_list_insert;

		_ret_query:='select allocation_code::varchar from unnest(array['''||array_to_string(_plan_list, ''', ''','')||''']::text[]) as allocation_code';
		return query execute(_ret_query);
	end
		$function$
;
