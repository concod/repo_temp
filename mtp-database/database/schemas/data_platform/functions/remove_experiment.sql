--liquibase formatted sql
--changeset manoj.solanki@impactanalytics.co:remove_experiment runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: initial changeset for remove_experiment
--rollback: SELECT 1
DROP FUNCTION IF EXISTS data_platform.remove_experiment(
	input jsonb,
	user_id integer);

CREATE OR REPLACE FUNCTION data_platform.remove_experiment(
	input jsonb,
	user_id integer)
    RETURNS void
    LANGUAGE 'plpgsql'
AS $FUNCTION$
 declare 
 _input_json json; 
 _key text;
 _value text;
 _experiment_id int;
 _config_id int;
 _workstream_id int;
 _delete_query text;
 _deleted_at timestamp := now();
 begin
 	for _input_json in select json_array_elements(value::json) input_json from 
 			(select value from jsonb_each_text($1::jsonb)) t
 	 loop	
 		for _key, _value in SELECT * FROM jsonb_each_text(_input_json::jsonb) --WHERE value IS NOT NULL 
 		loop 
	 	if _key='experiment_id' then
        _experiment_id=_value;
 		end if;
 		end loop;
 		_delete_query := 'update "data_platform".experiment
						  set deleted_by= '||$2||', deleted_at='''||_deleted_at ||''', is_deleted=True
                          where experiment_id= '||_experiment_id||'  '	;
 		raise notice '%', _delete_query;
 		execute _delete_query;
 	 end loop;
 	 end
 ;
 
$FUNCTION$;