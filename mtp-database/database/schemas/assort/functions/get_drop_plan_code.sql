--liquibase formatted sql
--changeset sadhana.j:get_drop_plan_code runOnChange:true stripComments:false splitStatements:false context:added_sp :liquibase_project_start
--comment: initial comment get_drop_plan_code
--rollback: SELECT 1


DROP FUNCTION IF EXISTS assort.get_drop_plan_code(input integer);

CREATE OR REPLACE FUNCTION assort.get_drop_plan_code(input integer)
 RETURNS TABLE(plan_code integer)
 LANGUAGE plpgsql
AS $function$
declare
	_query_combine text;
	begin
		_query_combine := 'SELECT distinct plan_code FROM assort.plan_wedge_opt_drop where plan_code  = ' || $1 ||'
';
		raise notice '%', _query_combine;
		RETURN QUERY execute _query_combine;
 	end
$function$
;
