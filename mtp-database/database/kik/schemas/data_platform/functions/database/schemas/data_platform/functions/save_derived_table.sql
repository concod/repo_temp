
--liquibase formatted sql
--changeset himani.sharma@impactanalytics.co:save_derived_tables_mapping_alter runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:added db_type
--comment: added db type
DROP FUNCTION IF EXISTS data_platform.save_derived_table(
	input jsonb,user_id integer);

CREATE OR REPLACE FUNCTION data_platform.save_derived_table(
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
 _run_in text;
 _replace_flag_gbq text;
 _replace_flag_psg text;
 _execution_order int;
 _type text;
 _label text DEFAULT 'public';
 _db text DEFAULT 'common';
 _schedule_interval text;
 _db_type text;
 _created_at timestamp := now();
 _insert_query text;
 _delete_query text;
 _user int:=$2; 
 _deleted_at timestamp := now();
 begin
 _delete_query:='update "data_platform".derived_tables_mapping set is_deleted=True, updated_by= '||_user ||',updated_at='''||_deleted_at ||''' where True ';
 raise notice '%', _delete_query;
 execute _delete_query;
 	for _input_json in select json_array_elements(value::json) input_json from 
 			(select value from jsonb_each_text($1::jsonb)) t
 	 loop	
 		for _key, _value in SELECT * FROM jsonb_each_text(_input_json::jsonb) --WHERE value IS NOT NULL 
 		loop 
	 	if 	_key ='name' then 
 		_name=_value;
 		elsif _key ='run_in' then 
 		_run_in = _value;
		
		
		elsif _key ='replace_flag_gbq' then 
		if _value is null then _replace_flag_gbq='null'; else _replace_flag_gbq=E'\''||_value||E'\''; end if;

		elsif _key ='replace_flag_psg' then 
		if _value is null then _replace_flag_psg='null'; else _replace_flag_psg=E'\''||_value||E'\''; end if;

        elsif _key='execution_order' then
        _execution_order=_value;
        elsif _key='type' then
        _type=_value;
        elsif _key='schedule_interval' then
        _schedule_interval=_value;
        elsif _key='label' then
        _label=_value;
        elsif _key='db' then
        _db=_value;
		elsif _key='db_type' then
		_db_type=_value;
 		end if;
 		end loop;
		
 		_insert_query:='insert into  "data_platform".derived_tables_mapping (name,run_in,replace_flag_gbq,replace_flag_psg,execution_order,type,schedule_interval,db_type,label,db,created_by,created_at)  
                        	values ('''||_name||''','''||_run_in||''','||_replace_flag_gbq||','||_replace_flag_psg||','''||_execution_order||''','''||_type||''','''||_schedule_interval||''','''||_db_type||''','''||_label||''','''||_db||''','||_user ||','''||_created_at ||''')';
		raise notice '%', _insert_query;
		execute _insert_query;
 	 end loop;
 	 end
 ;
 
$FUNCTION$;