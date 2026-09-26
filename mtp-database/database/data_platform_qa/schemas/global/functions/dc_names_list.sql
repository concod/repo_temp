--liquibase formatted sql
--changeset liquibase:dc_names_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for dc_names_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.dc_names_list(input integer[]);
CREATE OR REPLACE FUNCTION global.dc_names_list(input integer[])
 RETURNS TABLE(dc_name text[])
 LANGUAGE plpgsql
AS $function$
declare
	_query_combine text:='';
	begin
		
		_query_combine := 'select array_agg(name::text) dc_name from global.distribution_centres dc where dc_code = any('''||concat($1)||''')';
		raise notice '%', _query_combine;
		RETURN QUERY execute _query_combine;
	end
	$function$
;
