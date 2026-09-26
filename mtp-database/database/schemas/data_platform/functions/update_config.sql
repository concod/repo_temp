--liquibase formatted sql
--changeset liquibase:update_config runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for update_config
--rollback: SELECT 1
DROP FUNCTION IF EXISTS data_platform.update_config(
	input jsonb,
	user_id integer);

CREATE OR REPLACE FUNCTION data_platform.update_config(
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
 _config_id int;
 _module int;
 _user int:=$2; 
 _updated_at timestamp := now();
 _update_query text;
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
        elsif _key='config_id' then
        _config_id=_value;
 		end if;
 		end loop;
 		_update_query := 'update "data_platform".config 
                          set config_name= '''||_config_name||''',config_value = '''||_config_value||''',module_id ='||_module ||',updated_by= '||_user ||',updated_at='''||_updated_at ||'''
                          where config_id= '''||_config_id||''' and module_id ='||_module ||' '	;
 		raise notice '%', _update_query;
 		execute _update_query;
 	 end loop;
 	 end
 ;
 
$FUNCTION$;