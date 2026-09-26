--liquibase formatted sql
--changeset liquibase:list_table_info runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for list_table_info
--rollback: SELECT 1
DROP FUNCTION IF EXISTS data_platform.list_table_info(
	input jsonb);

CREATE OR REPLACE FUNCTION data_platform.list_table_info(
	input jsonb)
    RETURNS TABLE(table_id integer, table_name character varying, table_description character varying, table_location character varying) 
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
			table_id,
			table_name,
			table_description,
			table_location
			from
 	data_platform.table_info t
	where is_deleted =False
	 ) X ' || _query_table_filters;
 		raise notice '%', _query_combine;
 RETURN QUERY execute _query_combine;
  	end
 
$FUNCTION$;