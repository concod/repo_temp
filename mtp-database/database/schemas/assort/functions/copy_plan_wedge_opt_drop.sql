--liquibase formatted sql
--changeset mohammed.ayaz@impactanalytics.co:copy_plan_wedge_opt_drop runOnChange:true stripComments:false splitStatements:false context:MTP-21175 labels: change the table_name to plan_budget_master_drop for drop data.
--comment: change the table_name to plan_budget_master_drop for drop data for assort schema
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort.copy_plan_wedge_opt_drop(new_plan_code integer, existing_plan_code integer);
CREATE OR REPLACE FUNCTION assort.copy_plan_wedge_opt_drop(new_plan_code integer, existing_plan_code integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
begin
	insert into "assort".plan_budget_master_drop(plan_code, levels, attribute_value)
		(select $1, levels, attribute_value from "assort".plan_budget_master_drop where plan_code = $2);
end;
$function$;
