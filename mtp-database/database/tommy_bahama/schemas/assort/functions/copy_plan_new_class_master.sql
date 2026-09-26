--liquibase formatted sql
--changeset liquibase:copy_plan_new_class_master runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for copy_plan_new_class_master
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort.copy_plan_new_class_master(new_plan_code integer, existing_plan_code integer);
/*
    Author : Pradeep Nayak
    Date: 08-03-2022

    Copies plan new class master data to new plan
*/
CREATE OR REPLACE FUNCTION assort.copy_plan_new_class_master(new_plan_code integer, existing_plan_code integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
begin
	insert into "assort".plan_new_l3_master(plan_code, levels, "attributes", style_code) 
		(select $1, levels, "attributes", style_code from "assort".plan_new_l3_master where plan_code = $2);
end;
$function$

;