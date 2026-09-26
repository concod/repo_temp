--liquibase formatted sql
--changeset liquibase:list_users1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for list_users1
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.list_users1(input jsonb);
CREATE OR REPLACE FUNCTION global.list_users1(input jsonb)
 RETURNS TABLE(user_list character varying)
 LANGUAGE plpgsql
AS $function$
declare
	_keys text[] ;
 	_vals text[] ;
	_key text;
	_value text;
	_query_table_filters text := '';
	_query_combine text;
	_input_json json ;
	begin
		
		--_query_table_filters := "global".form_table_query($2);	
	 for _input_json in select json_array_elements(value::json) input_json from 
			(select value from jsonb_each_text($1)) x
	loop	
	   raise notice '%',_input_json;
	 end loop;
	 	
 	end
$function$
;
