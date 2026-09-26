--liquibase formatted sql
--changeset liquibase:copy_plan_carryover_style runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for copy_plan_carryover_style
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort_smart.copy_plan_carryover_styles(new_plan_code integer, existing_plan_code integer);
CREATE OR REPLACE FUNCTION assort_smart.copy_plan_carryover_styles(new_plan_code integer, existing_plan_code integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
begin
	insert into "assort_smart".plan_carryover_styles(plan_code, levels, is_active, attribute_value)
		(select $1, levels, is_active, attribute_value from "assort_smart".plan_carryover_styles where plan_code = $2);
end;
$function$

;