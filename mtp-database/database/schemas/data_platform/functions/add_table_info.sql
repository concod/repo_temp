--liquibase formatted sql
--changeset liquibase:add_table_info runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for add_table_info
--rollback: SELECT 1
DROP FUNCTION IF EXISTS data_platform.add_table_info(
	input jsonb,
	user_id integer);


CREATE OR REPLACE FUNCTION data_platform.add_table_info(
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
	 	if 	_key ='table_name' then 
 		_table_name=_value;
 		elsif _key ='table_description' then 
 		_table_description = _value;
        elsif _key='table_location' then
        _table_location=_value;
 		end if;
 		end loop;
		_delete_query:='delete from "data_platform".table_info where table_name= '''||_table_name||''' and is_deleted =True ';
 		_insert_query:='insert into  "data_platform".table_info (table_name,table_description,table_location,created_by,created_at)  
                          values ('''||_table_name||''','''||_table_description||''','''||_table_location||''','||_user ||','''||_created_at ||''')';
 		raise notice '%', _delete_query;
		raise notice '%', _insert_query;
 		execute _delete_query;
		execute _insert_query;
 	 end loop;
 	 end
 ;
 
$FUNCTION$;