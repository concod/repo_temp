--liquibase formatted sql
--changeset liquibase:update_table_info runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for update_table_info
--rollback: SELECT 1
DROP FUNCTION IF EXISTS data_platform.update_table_info(
	input jsonb,
	user_id integer);

CREATE OR REPLACE FUNCTION data_platform.update_table_info(
	input jsonb,
	user_id integer)
    RETURNS void
    LANGUAGE 'plpgsql'
AS $FUNCTION$
 declare 
 _input_json json; 
 _key text;
 _value text;
 _table_name text;
 _table_description text;
 _table_location text;
 _table_id int;
 _user int:=$2; 
 _updated_at timestamp := now();
 _update_query text;
 begin
 	for _input_json in select json_array_elements(value::json) input_json from 
 			(select value from jsonb_each_text($1::jsonb)) t
 	 loop	
 		for _key, _value in SELECT * FROM jsonb_each_text(_input_json::jsonb) --WHERE value IS NOT NULL 
 		loop 
	 	if 	_key ='table_name' then 
 		_table_name=_value;
 		elsif _key ='table_description' then 
 		_table_description = _value;
        elsif _key='table_location' then
        _table_location=_value;
        elsif _key='table_id' then
        _table_id=_value;
 		end if;
 		end loop;
 		_update_query := 'update "data_platform".table_info 
                          set table_name= '''||_table_name||''',table_description = '''||_table_description||''',table_location ='''||_table_location ||''',updated_by= '||_user ||',updated_at='''||_updated_at ||'''
                          where table_id= '||_table_id||' ';
 		raise notice '%', _update_query;
 		execute _update_query;
 	 end loop;
 	 end
 ;
$FUNCTION$;