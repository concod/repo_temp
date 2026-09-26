--liquibase formatted sql
--changeset liquibase:store_attribute_filter runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_attribute_filter
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.store_attribute_filter(refcursor, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION global.store_attribute_filter(refcursor, jsonb, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
	_query_sm text := '';
	_query_sa text := '';
	_query_table_filters text := '';
	_query_combine text := '';
	begin
		_query_sm := 'SELECT * FROM "global".store_master' || ("global".form_main_table_filters('store_master', $2));
 		_query_sa := "global".form_attribute_table_filters_v2('store_attributes', 'store_code', $3);
		_query_table_filters := "global".form_table_query($4);
 		_query_combine := 'SELECT * FROM (SELECT * FROM (' || _query_sm || ') main JOIN (' || _query_sa || ') attributes ON main.store_code = attributes.store_code) X ' || _query_table_filters;
 	raise notice '%',_query_combine;
 	OPEN $1 FOR execute _query_combine;
		RETURN $1;
	end
$function$
;
