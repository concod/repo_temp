--liquibase formatted sql
--changeset manoj.solanki@impactanalytics.co:add_data_source_config runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for add_data_source_config
--rollback: SELECT 1
DROP FUNCTION IF EXISTS data_platform.add_data_source_config(
	input jsonb,
	user_id integer);

CREATE OR REPLACE FUNCTION data_platform.add_data_source_config(
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
 _config_type text;
 _is_valid boolean;
 _user int:=$2; 
 _created_at timestamp := now();
 _insert_query text;
 _delete_query text;
 begin
 		for _key, _value in SELECT * FROM jsonb_each_text($1::jsonb) --WHERE value IS NOT NULL 
 		loop 
	 	if 	_key ='name' then 
 		_config_name=_value;
 		elsif _key ='type' then 
 		_config_type = _value;
        elsif _key='is_valid' then
        _is_valid=_value;
 		end if;
 		end loop;
		_delete_query:='delete from "data_platform".data_source_config where name= '''||_config_name||'''  and is_deleted =True ';
 		_insert_query:='insert into  "data_platform".data_source_config (name,type,is_valid,created_by,created_at)  
                          values ('''||_config_name||''','''||_config_type||''','||_is_valid ||','||_user ||','''||_created_at ||''')';
 		raise notice '%', _delete_query;
		raise notice '%', _insert_query;
 		execute _delete_query;
		execute _insert_query;
 	 end
 ;
 
$FUNCTION$;