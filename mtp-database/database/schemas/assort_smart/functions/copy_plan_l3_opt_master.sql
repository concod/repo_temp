--liquibase formatted sql
--changeset liquibase:copy_plan_l3_opt_master runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for copy_plan_l3_opt_master
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort_smart.copy_plan_l3_opt_master(new_plan_code integer, existing_plan_code integer);
CREATE OR REPLACE FUNCTION assort_smart.copy_plan_l3_opt_master(new_plan_code integer, existing_plan_code integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
begin
	insert into "assort_smart".plan_l3_opt_master (plan_code, levels, attribute_value, is_active) 
	(select $1, levels, attribute_value, is_active from "assort_smart".plan_l3_opt_master where plan_code = $2);
end;
$function$

;