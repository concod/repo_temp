--liquibase formatted sql
--changeset liquibase:MTP-80976 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-80976
--comment: remove deleted sg from rcl_dc_store_policy
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.remove_store_group(input integer, integer);
CREATE OR REPLACE FUNCTION global.remove_store_group(input integer, integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
 	declare 
 		_query text;
 		_inventory_schema_exists_query text;
 		_inventory_update_query text;
 		_inventory_schema_exists_bool bool;
		_store_groups_grade_table_exists_query text;
		_store_groups_grade_table_exists bool;
		_store_groups_update_query text;
		_rcl_dc_store_policy_table_exists_query text;
		_rcl_dc_store_policy_table_exists bool;
		_rcl_dc_store_policy_update_query text;
 	begin
 		_query := 'update
 			"global".store_groups
 		set
 			is_deleted = true,
 			updated_at = now(),
 			updated_by = ' || $2 || '
 		where
 			sg_code = ' || $1 || ';';
 		execute _query;
 		_inventory_schema_exists_query := 'SELECT EXISTS(SELECT 1 FROM information_schema.schemata 
              WHERE schema_name = ''inventory_smart'')';
        execute _inventory_schema_exists_query into _inventory_schema_exists_bool;

       	if _inventory_schema_exists_bool then
	 		_inventory_update_query := 'update inventory_smart.ph_configuration_mapping  set default_store_groups = array_remove(default_store_groups,' || $1 || ') where ' || $1 || '= any(default_store_groups)';
			execute _inventory_update_query;
		end if;
		_store_groups_grade_table_exists_query := 'SELECT EXISTS (SELECT 1 FROM information_schema.tables 
				WHERE  table_schema = ''global''  AND  table_name = ''store_groups_to_grade'');';
		execute _store_groups_grade_table_exists_query into _store_groups_grade_table_exists;
		if _store_groups_grade_table_exists then
			_store_groups_update_query := 'update
					"global".store_groups_to_grade
				set
					is_deleted = true,
					updated_at = now(),
					updated_by = ' || $2 || '
				where
					sg_code = ' || $1 || ';';
			execute _store_groups_update_query;
		end if;

		_rcl_dc_store_policy_table_exists_query := 'SELECT EXISTS (SELECT 1 FROM information_schema.tables 
				WHERE  table_schema = ''inventory_smart''  AND  table_name = ''rcl_dc_store_policy'');';
		raise notice '%', _rcl_dc_store_policy_table_exists_query;
		execute _rcl_dc_store_policy_table_exists_query into _rcl_dc_store_policy_table_exists;
		if _rcl_dc_store_policy_table_exists then
			_rcl_dc_store_policy_update_query := '        
					UPDATE "inventory_smart".rcl_dc_store_policy
        			SET default_store_groups = array_remove(default_store_groups,' || $1 ||'),
            		updated_at = now()
        			WHERE ' || $1 || '= ANY(default_store_groups);';
			raise notice '%', _rcl_dc_store_policy_update_query;
			execute _rcl_dc_store_policy_update_query;
		end if;
 	end $function$
;