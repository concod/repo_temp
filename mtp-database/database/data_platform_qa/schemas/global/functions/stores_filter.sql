--liquibase formatted sql
--changeset liquibase:stores_filter runAlways:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for stores_filter
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.stores_filter(input jsonb, jsonb);
CREATE OR REPLACE FUNCTION global.stores_filter(input jsonb, jsonb)
 RETURNS SETOF global.store_master
 LANGUAGE plpgsql
AS $function$
	declare
	_query text;
	begin
		_query := 'SELECT * FROM (SELECT * FROM "global".store_master' || ("global".form_main_table_filters('store_master', $1)) || ') X ' || ("global".form_table_query('{}'));
 		-- raise notice '%',_query;
		RETURN QUERY EXECUTE _query;
	end $function$
;
