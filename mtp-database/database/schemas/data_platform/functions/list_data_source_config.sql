--liquibase formatted sql
--changeset liquibase:list_data_source_config runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for list_data_source_config
--rollback: SELECT 1
DROP FUNCTION IF EXISTS data_platform.list_data_source_config(
	input jsonb);

CREATE OR REPLACE FUNCTION data_platform.list_data_source_config(
	input jsonb)
    RETURNS TABLE(data_source_config_id integer, name character varying, type character varying, is_valid boolean) 
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
			data_source_config_id,
			name,
			type,
			is_valid
			from
 	data_platform.data_source_config t
	where is_deleted =False
	 ) X ' || _query_table_filters;
 		raise notice '%', _query_combine;
 RETURN QUERY execute _query_combine;
  	end
 
$FUNCTION$;