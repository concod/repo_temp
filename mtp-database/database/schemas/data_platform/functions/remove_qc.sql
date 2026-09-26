--liquibase formatted sql
--changeset liquibase:remove_qc runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for remove_qc
--rollback: SELECT 1
DROP FUNCTION IF EXISTS data_platform.remove_qc(
	input jsonb,
	user_id integer);

CREATE OR REPLACE FUNCTION data_platform.remove_qc(
	input jsonb,
	user_id integer)
    RETURNS void
    LANGUAGE 'plpgsql'
AS $FUNCTION$
 declare 
 _input_json json; 
 _key text;
 _value text;
 _qc_id text;
 _delete_query text;
 _deleted_at timestamp := now();
 begin
 	for _input_json in select json_array_elements(value::json) input_json from 
 			(select value from jsonb_each_text($1::jsonb)) t
 	 loop	
 		for _key, _value in SELECT * FROM jsonb_each_text(_input_json::jsonb) --WHERE value IS NOT NULL 
 		loop 
	 	if 	_key ='qc_id' then 
 		_qc_id=_value;
 		end if;
 		end loop;
 		_delete_query := 'update "data_platform".custom_qc
						  set deleted_by= '||$2||', deleted_at='''||_deleted_at ||''', is_deleted=True
                          where qc_id= '||_qc_id||'  '	;
 		raise notice '%', _delete_query;
 		execute _delete_query;
 	 end loop;
 	 end
 ;
 
$FUNCTION$;