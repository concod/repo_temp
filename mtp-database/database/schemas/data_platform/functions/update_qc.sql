--liquibase formatted sql
--changeset manoj.solanki@impactanalytics.co:update_qc runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: initial changeset for update_qc
--rollback: SELECT 1
DROP FUNCTION IF EXISTS data_platform.update_qc(
	input jsonb,
	user_id integer);

CREATE OR REPLACE FUNCTION data_platform.update_qc(
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
 _qc_type text;
 _qc_id int;
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
	 	if 	_key ='qc_name' then 
 		_qc_name=_value;
 		elsif _key ='qc_description' then 
 		_qc_description = _value;
		elsif _key ='qc_type' then 
 		_qc_type = _value;
        elsif _key='qc_id' then
        _qc_id=_value;
		elsif _key='table_id' then
        _table_id=_value;
 		end if;
 		end loop;
 		_update_query := 'update "data_platform".custom_qc 
                          set qc_name= '''||_qc_name||''',qc_description = '''||_qc_description||''',table_id = '||_table_id||',qc_type = '''||_qc_type||''',updated_by= '||_user ||',updated_at='''||_updated_at ||'''
                          where qc_id= '||_qc_id||' ';
 		raise notice '%', _update_query;
 		execute _update_query;
 	 end loop;
 	 end
 ;
 $FUNCTION$;
