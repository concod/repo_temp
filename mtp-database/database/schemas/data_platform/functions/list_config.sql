--liquibase formatted sql
--changeset liquibase:list_config runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for list_config
--rollback: SELECT 1
DROP FUNCTION IF EXISTS data_platform.list_config(
	input jsonb,
	module integer);


CREATE OR REPLACE FUNCTION data_platform.list_config(
	input jsonb,
	module integer)
    RETURNS TABLE(config_id integer, config_name character varying, config_value json, module_id integer) 
    LANGUAGE 'plpgsql'
    
AS $FUNCTION$
 declare
 	_key text;
 	_value text;
 	_query_table_filters text := '';
 	_query_combine text;
 	_column text;
 	_search text;
 	_input_json json;
 	
 	begin
 		_query_table_filters := "data_platform".form_table_query($1);
 		_query_combine := 'SELECT * FROM (
			select
			config_id,
			config_name,
			config_value,
			module_id
			from
 	data_platform.config p
	where module_id = '|| $2 ||' and is_deleted=False) X ' || _query_table_filters;
 		raise notice '%', _query_combine;
 RETURN QUERY execute _query_combine;
  	end
 
$FUNCTION$;