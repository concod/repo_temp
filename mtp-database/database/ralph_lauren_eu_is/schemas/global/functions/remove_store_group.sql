--liquibase formatted sql
--changeset liquibase:MTP-37056 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-37056
--comment: handled  store groups grade table delete 
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
			_inventory_update_query := 'update inventory_smart.ph_configuration_mapping
			set default_store_groups = array_remove(default_store_groups,' || $1 || '),
			    default_store_groups_selected = array_remove(default_store_groups_selected,' || $1 || ')
		    where ' || $1 || '= any(default_store_groups) OR ' || $1 || '= any(default_store_groups_selected) ';
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
 	end $function$
;