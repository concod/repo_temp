--liquibase formatted sql
--changeset liquibase:add_generic_trigger_mapping runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for add_generic_trigger_mapping
--rollback: SELECT 1
DROP FUNCTION IF EXISTS data_platform.add_config(
	input jsonb,
	user_id integer);

CREATE OR REPLACE FUNCTION data_platform.add_config(
	input jsonb,
	user_id integer)
    RETURNS void
    LANGUAGE 'plpgsql'
AS $FUNCTION$
 declare 
 _input_json json; 
 _key text;
 _value text;
 _config_name text;
 _config_value json;
 _config_display_name text;
 _module int;
 _user int:=$2; 
 _created_at timestamp := now();
 _insert_query text;
 _delete_query text;
 begin
 	for _input_json in select json_array_elements(value::json) input_json from 
 			(select value from jsonb_each_text($1::jsonb)) t
 	 loop	
 		for _key, _value in SELECT * FROM jsonb_each_text(_input_json::jsonb) --WHERE value IS NOT NULL 
 		loop 
	 	if 	_key ='config_name' then 
 		_config_name=_value;
 		elsif _key ='config_value' then 
 		_config_value = _value;
        elsif _key='module_id' then
        _module=_value;
 		end if;
 		end loop;
		_delete_query:='delete from "data_platform".config where config_name= '''||_config_name||''' and module_id ='||_module ||' and is_deleted =True ';
 		_insert_query:='insert into  "data_platform".config (config_name,config_value,module_id,created_by,created_at)  
                          values ('''||_config_name||''','''||_config_value||''','||_module ||','||_user ||','''||_created_at ||''')';
 		raise notice '%', _delete_query;
		raise notice '%', _insert_query;
 		execute _delete_query;
		execute _insert_query;
 	 end loop;
 	 end
 ;
 
$FUNCTION$;