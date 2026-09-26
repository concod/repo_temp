--liquibase formatted sql
--changeset liquibase:update_result runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for update_result
--rollback: SELECT 1
DROP FUNCTION IF EXISTS data_platform.update_result(
	status character varying,
	input json,
	task_id character varying,
	experiment_id integer,
	user_id integer);

CREATE OR REPLACE FUNCTION data_platform.update_result(
	status character varying,
	input json,
	task_id character varying,
	experiment_id integer,
	user_id integer)
    RETURNS void
    LANGUAGE 'plpgsql'
AS $FUNCTION$
 declare 
_update_query text;
_updated_at timestamp := now();

 begin
    _update_query := 'update  "data_platform".experiment 
							set updated_by= '||$5||',updated_at ='''||_updated_at||''', result='''||$2||''',status='''||$1||''', result_id='''||$3||''' 
                            where experiment_id= '||$4||' ';
    raise notice '%', _update_query;
    execute _update_query;
end
 ;
 
$FUNCTION$;