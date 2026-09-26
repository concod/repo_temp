--liquibase formatted sql
--changeset liquibase:get_plan_code runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_plan_code
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort_smart.get_plan_code(input integer);
CREATE OR REPLACE FUNCTION assort_smart.get_plan_code(input integer)
 RETURNS TABLE(plan_code integer)
 LANGUAGE plpgsql
AS $function$
/*
Function/Procedure name: assort.get_plan_code
Created by: Mohammed Ayaz
Created at: 7-Jan-2023
Update at: 7-Jan-2023
No of input parameter: 1
Parameter Description : $1, plan_code int

Purpose: This function been created to check plan_code in plan_budget_master for plan-review-screen

returns:
 plan_code if exits

Calling Statement:
SELECT * from assort_smart.get_plan_code(12);

Mohammed Ayaz:
*/
declare
	_query_combine text;
	begin
		_query_combine := 'SELECT distinct plan_code FROM assort_smart.plan_budget_master where plan_code  = ' || $1 ||'
';
		raise notice '%', _query_combine;
		RETURN QUERY execute _query_combine;
 	end
$function$
;