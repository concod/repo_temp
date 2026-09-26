--liquibase formatted sql
--changeset liquibase:screens_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for screens_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.screens_list(input text[]);
CREATE OR REPLACE FUNCTION global.screens_list(input text[])
 RETURNS TABLE(attribute character varying)
 LANGUAGE plpgsql
AS $function$
 declare
 	_query text;
	begin

	 _query :='
	select
	    distinct screen_name screen
		from
			"global".screen_master
		where (dimensions @> (''' || concat($1) || '''::varchar[]) and dimensions <@ (''' || concat($1) || '''::varchar[]))'
			;
	raise notice '%',_query;
	return query execute _query;
	end
	$function$
;
