--liquibase formatted sql
--changeset liquibase:copy_plan_budget_master runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for copy_plan_budget_master
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort_smart.copy_plan_budget_master(new_plan_code integer, existing_plan_code integer);
/*
    Author : Pradeep Nayak
    Date: 08-03-2022

    Copies plan budget master data to new plan
    
    Updated by: MD Ayaz
    changes: Move to assort_smart schema
*/
CREATE OR REPLACE FUNCTION assort_smart.copy_plan_budget_master(new_plan_code integer, existing_plan_code integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
begin
	insert into "assort_smart".plan_budget_master (plan_code, levels, attribute_value) 
	(select $1, levels, attribute_value from "assort_smart".plan_budget_master where plan_code = $2);
end;
$function$

;