--liquibase formatted sql
--changeset liquibase:copy_plan_wedge_opt_constraint runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for copy_plan_wedge_opt_constraint
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort_smart.copy_plan_wedge_opt_constraint(new_plan_code integer, existing_plan_code integer);
CREATE OR REPLACE FUNCTION assort_smart.copy_plan_wedge_opt_constraint(new_plan_code integer, existing_plan_code integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
begin
	insert into "assort_smart".plan_wedge_opt_constraint(plan_code, levels, special_classification, attribute_value)
		(select $1, levels, special_classification, attribute_value from "assort_smart".plan_wedge_opt_constraint where plan_code = $2);
end;
$function$

;