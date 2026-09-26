--liquibase formatted sql
--changeset pradiksha.k@impactanalytics.co:update_plan_step runOnChange:true stripComments:false splitStatements:false context:MTP-23511labels:liquibase_project_start
--comment: changes to update both plan_step and plan_sub_step.
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort.update_plan_step(input integer, numeric);
CREATE OR REPLACE FUNCTION assort.update_plan_step(input integer, numeric, text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
 declare
 		_query text;
 	begin
 		_query :=  'UPDATE "assort".plan_master SET steps= '|| $2 ||' ,plan_sub_step= ''' || $3 || ''', updated_at = now() where plan_code = ' || $1 || ' ;';
 		execute _query;
 	end
 	$function$
;

