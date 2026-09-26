--liquibase formatted sql
--changeset liquibase:get_config runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_config
--rollback: SELECT 1
DROP FUNCTION IF EXISTS data_platform.get_config(
	config integer);

CREATE OR REPLACE FUNCTION data_platform.get_config(
	config integer)
    RETURNS TABLE(config_id integer, config_name character varying, config_value json, module_id integer) 
    LANGUAGE 'plpgsql'
AS $FUNCTION$
 declare 
_select_query text;
_updated_at timestamp := now();

 begin
    _select_query := 'select config_id, config_name, config_value, module_id from "data_platform".config 
                            where config_id= '||$1||' ';
    raise notice '%', _select_query;
    RETURN QUERY execute _select_query;
end
 ;
 
$FUNCTION$;