--liquibase formatted sql
--changeset hisham.mohammed@impactanalytics.co:save_generic_trigger_mapping_instance runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: added save_generic_trigger_mapping_instance function

DROP FUNCTION IF EXISTS data_platform.save_generic_trigger_mapping_instance(jsonb, int4, varchar);

CREATE OR REPLACE FUNCTION data_platform.save_generic_trigger_mapping_instance(
  input jsonb, 
  user_id integer, 
  p_instance character varying
  )
 RETURNS void
 LANGUAGE plpgsql
AS $function$

/*
Created by : Hisham Mohammed   Created On :23rd June,2025    
*/
 declare 
    _view text;
	_source_config text;
	_connector text ;
	_trigger_rule text ;
	_trigger_query text ;
	_trigger_query_filter text ;
	_trigger_file text ;
	_is_mandatory bool; 
    _input_json json; 
    _key text;
    _value text;
	_insert_query text;
    _user int:=$2; 
	_delete_query text;
    _deleted_at timestamp := now();
    _created_at timestamp := now();
 begin
	_delete_query:='update "data_platform".generic_trigger_mapping set is_deleted=True, deleted_by= '||_user ||',deleted_at='''||_deleted_at ||''' where "instance"='''||p_instance::smallint ||''' ';
	raise notice '%', _delete_query;
	execute _delete_query;
 	for _input_json in select json_array_elements(value::json) input_json from 
 			(select value from jsonb_each_text($1::jsonb)) t
 	 loop	
 		for _key, _value in SELECT * FROM jsonb_each_text(_input_json::jsonb) --WHERE value IS NOT NULL 
 		loop 
	 	if 	_key ='view' then 
 		_view=_value;
 		elsif _key ='source_config' then 
        _source_config = _value;
		elsif _key ='connector' then 
 		_connector = _value;
		elsif _key='trigger_rule' then
        if _value is null then _trigger_rule='null'; else _trigger_rule=E'\''||_value||E'\''; end if;
       elsif _key='trigger_query' then
		if _value is null then _trigger_query='null'; else _trigger_query=E'\''||replace(replace(_value,E'\'','"'),E'\"','''''')||E'\''; end if;
        elsif _key='trigger_query_filter' then
		if _value is null then _trigger_query_filter='null'; else _trigger_query_filter=E'\''||replace(replace(_value,E'\'','"'),E'\"','''''')||E'\''; end if;
        elsif _key='trigger_file' then
        if _value is null then _trigger_file='null'; else _trigger_file=E'\''||_value||E'\''; end if;
        elsif _key='is_mandatory' then
        _is_mandatory=_value;
 		end if;
 		end loop;		
		_insert_query:='INSERT INTO "data_platform".generic_trigger_mapping (view, source_config, connector, trigger_rule, trigger_query,  trigger_query_filter, trigger_file, is_mandatory,created_by,created_at, instance)
                            VALUES('''||_view||''', '''||_source_config||''', '''||_connector||''', '||_trigger_rule||', '||_trigger_query||',  '||_trigger_query_filter||', '||_trigger_file||', '||_is_mandatory||','||_user ||','''||_created_at ||''','''||p_instance::smallint ||''');';
        raise notice '%', _insert_query;
		execute _insert_query;
 	 end loop;
 	 end
 ;
 
$function$
;
