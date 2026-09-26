--liquibase formatted sql
--changeset liquibase:copy_plan_cluster_depth_choice runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for copy_plan_cluster_depth_choice
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort.copy_plan_cluster_depth_choice(new_plan_code integer, existing_plan_code integer);
/*
    Author : Pradeep Nayak
    Date: 08-03-2022

    Copies plan cluster depth data to new plan
*/
CREATE OR REPLACE FUNCTION assort.copy_plan_cluster_depth_choice(new_plan_code integer, existing_plan_code integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
begin
	insert into "assort".plan_cluster_depth_choice(plan_code, levels, attribute_value)
		(select $1, levels, attribute_value from "assort".plan_cluster_depth_choice where plan_code = $2);
end;
$function$

;