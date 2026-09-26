--liquibase formatted sql
--changeset liquibase:update_finalize_status runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for update_finalize_status
--rollback: SELECT 1
DROP FUNCTION IF EXISTS data_platform.update_finalize_status(
	workstream_id integer,
	experiment_id integer,
	user_id integer);

CREATE OR REPLACE FUNCTION data_platform.update_finalize_status(
	workstream_id integer,
	experiment_id integer,
	user_id integer)
    RETURNS void
    LANGUAGE 'plpgsql'
AS $FUNCTION$
 declare 
_reset_query text;
_update_query text;
_updated_at timestamp := now();

 begin
    _reset_query := 'update "data_platform".experiment 
                      set is_finalized =False, updated_by= '||$3||',updated_at ='''||_updated_at||'''
                      where is_finalized = True and workstream_id='||$1||' ';
    _update_query := 'update  "data_platform".experiment 
							set updated_by= '||$3||',updated_at ='''||_updated_at||''', is_finalized = True
                            where experiment_id= '||$2||' ';
    raise notice '%', _update_query;
    execute _update_query;
end
 ;
 
$FUNCTION$;