--liquibase formatted sql
--changeset liquibase:stores_attribute_filter runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for stores_attribute_filter
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.stores_attribute_filter(input refcursor, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION global.stores_attribute_filter(input refcursor, jsonb, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
	declare
	_query_pm text := '';
	_query_pa text := '';
	_query_table_filters text := '';
	_query_combine text := '';
	begin
		_query_pm := 'SELECT * FROM "global".store_master' || ("global".form_main_table_filters('store_master', $2));
		raise notice '%',_query_pm;
 		_query_pa := "global".form_attribute_table_filters('store_attributes', 'store_code', $3);
 		raise notice '%',_query_pa;
		_query_table_filters := "global".form_table_query($4);
		raise notice '%',_query_table_filters;
 		_query_combine := 'SELECT * FROM (SELECT * FROM (' || _query_pm || ') main JOIN (' || _query_pa || ') attributes ON main.store_code = attributes.store_code) X ' || _query_table_filters;
		OPEN $1 FOR execute _query_combine;
		RETURN $1;
	end $function$
;
