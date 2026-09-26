--liquibase formatted sql
--changeset manoj.solanki@impactanalytics.co:add_experiment runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: initial changeset for add_experiment
--rollback: SELECT 1
DROP FUNCTION IF EXISTS data_platform.add_experiment(
	input jsonb,
	user_id integer);


CREATE OR REPLACE FUNCTION data_platform.add_experiment(
	input jsonb,
	user_id integer)
    RETURNS void
    LANGUAGE 'plpgsql'
AS $FUNCTION$
 declare 
 _input_json json; 
 _key text;
 _value text;
 _experiment_name text;
 _config_id int;
 _module_id int;
 _workstream_id int;
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
	 	if 	_key ='experiment_name' then 
 		_experiment_name=_value;
 		elsif _key ='config_id' then 
 		_config_id = _value;
        elsif _key='workstream_id' then
        _workstream_id=_value;
		elsif _key='module_id' then
        _module_id=_value;
 		end if;
 		end loop;
		_delete_query:= ' delete from "data_platform".experiment where experiment_name= '''||_experiment_name||''' and config_id ='||_config_id ||' and workstream_id ='||_workstream_id ||' and is_deleted=True ';
 		_insert_query := 'insert into  "data_platform".experiment (experiment_name,config_id,workstream_id,module_id,created_by,created_at)  
                          values ('''||_experiment_name||''','||_config_id||','||_workstream_id||','||_module_id||','||_user||','''||_created_at||''')'	;
 		raise notice '%', _delete_query;
		raise notice '%', _insert_query;
 		execute _delete_query;
		execute _insert_query;
 	 end loop;
 	 end
 ;
 
$FUNCTION$;