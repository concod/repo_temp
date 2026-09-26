--liquibase formatted sql
--changeset liquibase:products_filter runAlways:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for products_filter
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.products_filter(input jsonb, jsonb);
CREATE OR REPLACE FUNCTION global.products_filter(input jsonb, jsonb)
 RETURNS SETOF global.product_master
 LANGUAGE plpgsql
AS $function$
	declare
	_query text;
	begin
		_query := 'SELECT * FROM (SELECT * FROM "global".product_master' || ("global".form_main_table_filters('product_master', $1)) || ') X ' || ("global".form_table_query($2));
 		-- raise notice '%',_query;
		RETURN QUERY EXECUTE _query;
	end $function$
;
