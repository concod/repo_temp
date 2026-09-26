--liquibase formatted sql
--changeset liquibase:copy_plan_cluster_aps runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for copy_plan_cluster_aps
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort_smart.copy_plan_cluster_aps(new_plan_code integer, existing_plan_code integer);
/*
    Author : Pradeep Nayak
    Date: 08-03-2022

    Copies plan cluster aps data to new plan
    
    Edited by: MD Ayaz

    Moved to Assort Smart
*/
CREATE OR REPLACE FUNCTION assort_smart.copy_plan_cluster_aps(new_plan_code integer, existing_plan_code integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
begin
	insert into "assort_smart".plan_cluster_aps(plan_code, levels, is_final, attribute_value)
		(select $1, levels, is_final, attribute_value from "assort_smart".plan_cluster_aps where plan_code = $2);
end;
$function$

;