--liquibase formatted sql
--changeset liquibase:manoj.solanki@impactanalytics.co runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:save_kpi_master
--comment: initial changeset for save_kpi_master
--rollback: SELECT 1
DROP FUNCTION IF EXISTS data_platform.save_kpi_master(
	input jsonb,user_id integer);
CREATE OR REPLACE FUNCTION data_platform.save_kpi_master(
	input jsonb,
	user_id integer)
    RETURNS void
    LANGUAGE 'plpgsql'
AS $FUNCTION$
 declare 
 _input_json json; 
 _key text;
 _value text;
 _kpi_code text;
 _kpi text;
 _query text;
 _variable text;
 _table text; 
 _created_at timestamp := now();
 _insert_query text;
 _delete_query text;
 _user int:=$2; 
 _deleted_at timestamp := now();
 begin
	_delete_query:='update "data_platform".kpi_master set is_deleted=True, deleted_by= '||_user ||',deleted_at='''||_deleted_at ||''' where True ';
	raise notice '%', _delete_query;
	execute _delete_query;
 	for _input_json in select json_array_elements(value::json) input_json from 
 			(select value from jsonb_each_text($1::jsonb)) t
 	 loop	
 		for _key, _value in SELECT * FROM jsonb_each_text(_input_json::jsonb) --WHERE value IS NOT NULL 
 		loop 
	 	if 	_key ='kpicode' then 
 		_kpi_code=_value;
 		elsif _key ='kpi' then 
 		_kpi = _value;
		elsif _key ='query' then 
 		_query = _value;
		elsif _key='variable' then
        _variable=replace(_value,E'\'','"');
		elsif _key='table' then
        _table=replace(_value,E'\'','"');
 		end if;
 		raise notice '%   %', _key,_value;
 		end loop;
		
 		_insert_query:='insert into  "data_platform".kpi_master (kpicode,kpi,query,variable,"table",created_by,created_at)  
                          values ('''||_kpi_code||''','''||_kpi||''','''||_query||''','''||_variable||''','''||_table||''','||_user ||','''||_created_at ||''')';
     	raise notice '%', _insert_query;
		execute _insert_query;
 	 end loop;
 	 end
 ;
 
$FUNCTION$;