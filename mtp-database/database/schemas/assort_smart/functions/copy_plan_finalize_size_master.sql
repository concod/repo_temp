--liquibase formatted sql
--changeset liquibase:copy_plan_finalize_size_master runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for copy_plan_finalize_size_master
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort_smart.copy_plan_finalize_size_master(new_plan_code integer, existing_plan_code integer);
CREATE OR REPLACE FUNCTION assort_smart.copy_plan_finalize_size_master(new_plan_code integer, existing_plan_code integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
begin
	insert into "assort_smart".plan_finalize_size_master(plan_code, levels, "attributes")
		(select $1, levels, "attributes" from "assort_smart".plan_finalize_size_master where plan_code = $2);
end;
$function$

;