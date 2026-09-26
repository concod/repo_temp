--liquibase formatted sql
--changeset liquibase:test_get_plan_code runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for test_get_plan_code
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort.test_get_plan_code(input integer);
CREATE OR REPLACE FUNCTION assort.test_get_plan_code(input integer)
 RETURNS TABLE(plan_code integer)
 LANGUAGE plpgsql
AS $function$
declare
	_query_combine text;
	begin
		_query_combine := 'SELECT distinct plan_code FROM assort.plan_budget_master where plan_code  = ' || $1 ||'
';
		raise notice '%', _query_combine;
		RETURN QUERY execute _query_combine;
 	end
$function$

;