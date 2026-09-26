--liquibase formatted sql
--changeset liquibase:product_names_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_names_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.product_names_list(input text);
CREATE OR REPLACE FUNCTION global.product_names_list(input text)
 RETURNS TABLE(product_name text[])
 LANGUAGE plpgsql
AS $function$
declare
	_query_combine text:='';
	begin
		
		_query_combine := 'select array_agg(product_name::text) product_name from global.product_master dc where product_code = any('''||concat($1)||''')';
		raise notice '%', _query_combine;
		RETURN QUERY execute _query_combine;
	end
	$function$
;
