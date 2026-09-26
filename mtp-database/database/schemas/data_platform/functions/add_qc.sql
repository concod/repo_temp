--liquibase formatted sql
--changeset liquibase:add_qc runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for add_qc
--rollback: SELECT 1
DROP FUNCTION IF EXISTS data_platform.add_qc(
	input jsonb,
	user_id integer);


CREATE OR REPLACE FUNCTION data_platform.add_qc(
	input jsonb,
	user_id integer)
    RETURNS void
    LANGUAGE 'plpgsql'
AS $FUNCTION$
 declare 
 _input_json json; 
 _key text;
 _value text;
 _qc_name text;
 _qc_description text;
 _qc_query text;
 _qc_type text;
 _table_id int;
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
	 	if 	_key ='qc_name' then 
 		_qc_name=_value;
 		elsif _key ='qc_description' then 
 		_qc_description = _value;
		elsif _key ='qc_type' then 
 		_qc_type = _value;
		elsif _key='table_id' then
        _table_id=_value;
 		end if;
 		end loop;
		_delete_query:='delete from "data_platform".custom_qc where qc_name= '''||_qc_name||''' and is_deleted =True ';
 		_insert_query:='insert into  "data_platform".custom_qc (qc_name,qc_description,qc_type,table_id,created_by,created_at)  
                          values ('''||_qc_name||''','''||_qc_description||''','''||_qc_type||''','||_table_id||','||_user ||','''||_created_at ||''')';
 		raise notice '%', _delete_query;
		raise notice '%', _insert_query;
 		execute _delete_query;
		execute _insert_query;
 	 end loop;
 	 end
 ;
 
$FUNCTION$;
