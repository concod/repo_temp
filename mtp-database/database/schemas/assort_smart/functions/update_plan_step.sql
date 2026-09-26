--liquibase formatted sql
--changeset pradiksha.k@impactanalytics.co:update_plan_step runOnChange:true stripComments:false splitStatements:false context:MTP-23511 labels:liquibase_project_start
--comment: changes to update both plan_step and plan_sub_step.
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort_smart.update_plan_step(input integer, numeric);
CREATE OR REPLACE FUNCTION assort_smart.update_plan_step(input integer, numeric, text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
/*
Function/Procedure name: assort_smart.update_plan_step
Created by: Sadhana Jaiswal
Created at: 13-Jan-2023
Update at: 13-Jan-2023
No of input parameter: 2
Parameter Description : jsonb
Purpose: to update plan step in db

Calling Statement:
SELECT * from assort_smart.update_plan_step(202, 1)

*/

declare
		_query text;
	begin
		_query :=  'UPDATE "assort_smart".plan_master SET steps= '|| $2 ||', plan_sub_step = ''' || $3 || ''', updated_at = now() where plan_code = ' || $1 || ' ;';
		execute _query;
	end
	$function$
;

