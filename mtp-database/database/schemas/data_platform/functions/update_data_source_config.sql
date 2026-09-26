--liquibase formatted sql
--changeset manoj.solanki@impactanalytics.co:update_data_source_config runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: initial changeset for update_data_source_config
--rollback: SELECT 1
DROP FUNCTION IF EXISTS data_platform.update_data_source_config(
	input jsonb,
	user_id integer);

CREATE OR REPLACE FUNCTION data_platform.update_data_source_config(
	input jsonb,
	user_id integer)
    RETURNS void
    LANGUAGE 'plpgsql'
AS $FUNCTION$
 declare 
 _input_json json; 
 _key text;
 _value text;
 _name text;
 _type text;
 _config_id int;
 _is_valid boolean;
 _user int:=$2; 
 _updated_at timestamp := now();
 _update_query text;
 begin	
 		for _key, _value in SELECT * FROM jsonb_each_text($1::jsonb) --WHERE value IS NOT NULL 
 		loop 
	 	if 	_key ='name' then 
 		_name=_value;
		elsif _key ='type' then 
 		_type = _value;
        elsif _key='data_source_config_id' then
        _config_id=_value;
		elsif _key='is_valid' then
        _is_valid=_value;
 		end if;
 		end loop;
 		_update_query := 'update "data_platform".data_source_config 
                          set name= '''||_name||''', type = '''||_type||''',is_valid = '||_is_valid||', updated_by= '||_user ||',updated_at='''||_updated_at ||'''
                          where data_source_config_id= '||_config_id||' ';
 		raise notice '%', _update_query;
 		execute _update_query;
 	 end
 ;
 $FUNCTION$;
