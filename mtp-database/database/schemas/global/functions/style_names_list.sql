--liquibase formatted sql
--changeset liquibase:style_names_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for style_names_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.style_names_list(input character varying[]);
CREATE OR REPLACE FUNCTION global.style_names_list(input character varying[])
 RETURNS TABLE(dc_name text[])
 LANGUAGE plpgsql
AS $function$
declare
	_query_combine text:='';
	begin
		
		_query_combine := 'select array_agg(style_code::text) style_name 
		from global.style_master sm 
		where  1=1
		and style_code = any('''||concat($1::varchar[])||''')';
		raise notice '%', _query_combine;
		RETURN QUERY execute _query_combine;
	end
	$function$
;
