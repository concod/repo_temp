--liquibase formatted sql
--changeset liquibase:list_user_module_role runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for list_user_module_role
--rollback: SELECT 1
DROP FUNCTION IF EXISTS data_platform.list_user_module_role(
	input jsonb);

CREATE OR REPLACE FUNCTION data_platform.list_user_module_role(
	input jsonb)
    RETURNS TABLE(user_code integer, user_name character varying, module_id integer, module character varying, module_display_name character varying, role character varying) 
    LANGUAGE 'plpgsql'
    
AS $FUNCTION$
 declare
 	_key text;
 	_value text;
 	_query_table_filters text := '';
 	_query_combine text;
 	_column text;
 	_search text;
 	_input_json json;
 	
 	begin
 		_query_table_filters := "data_platform".form_table_query($1);
 		_query_combine := 'SELECT * FROM (
 select
 p.user_code,
 um.user_name,
 p.module_id,
 mm.module_name ,
 mm.display_name as module_display_name,
 p.role
 from
 	global.umr_master p
left join global.user_master um
using(user_code)
left join global.module_master mm
using(module_id) ) X ' || _query_table_filters;
 		raise notice '%', _query_combine;
 RETURN QUERY execute _query_combine;
  	end
 
$FUNCTION$;