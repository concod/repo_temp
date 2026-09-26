--liquibase formatted sql
--changeset manoj.solanki@impactanalytics.co:remove_config runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: initial changeset for remove_config
--rollback: SELECT 1
DROP FUNCTION IF EXISTS data_platform.remove_config(
	input jsonb,
	user_id integer);

CREATE OR REPLACE FUNCTION data_platform.remove_config(
	input jsonb,
	user_id integer)
    RETURNS void
    LANGUAGE 'plpgsql'
AS $FUNCTION$
 declare 
 _input_json json; 
 _key text;
 _value text;
 _config_id text;
 _module int;
 _delete_query text;
 _deleted_at timestamp := now();
 begin
 	for _input_json in select json_array_elements(value::json) input_json from 
 			(select value from jsonb_each_text($1::jsonb)) t
 	 loop	
 		for _key, _value in SELECT * FROM jsonb_each_text(_input_json::jsonb) --WHERE value IS NOT NULL 
 		loop 
	 	if 	_key ='config_id' then 
 		_config_id=_value;
        elsif _key='module_id' then
        _module=_value;
 		end if;
 		end loop;
 		_delete_query := 'update "data_platform".config
						  set deleted_by= '||$2||', deleted_at='''||_deleted_at ||''', is_deleted=True
                          where config_id= '||_config_id||' and module_id ='||_module ||' '	;
 		raise notice '%', _delete_query;
 		execute _delete_query;
 	 end loop;
 	 end
 ;
 
$FUNCTION$;