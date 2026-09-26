--liquibase formatted sql
--changeset liquibase:get_result runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_result
--rollback: SELECT 1
DROP FUNCTION IF EXISTS data_platform.get_result(
	experiment_id integer);

CREATE OR REPLACE FUNCTION data_platform.get_result(
	experiment_id integer)
    RETURNS TABLE(result json) 
    LANGUAGE 'plpgsql'

AS $FUNCTION$
 declare 
_select_query text;
_updated_at timestamp := now();

 begin
    _select_query := 'select result from "data_platform".experiment 
                            where experiment_id= '||$1||' and result is not null ';
    raise notice '%', _select_query;
    RETURN QUERY execute _select_query;
end
 ;
 
$FUNCTION$;