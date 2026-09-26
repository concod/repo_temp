--liquibase formatted sql
--changeset liquibase:copy_cluster_performance_attributes runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for copy_cluster_performance_attributes
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort.copy_cluster_performance_attributes(new_plan_code integer, existing_plan_code integer);
/*
    Author : Pradeep Nayak
    Date: 08-03-2022

    Copies cluster grade data to new plan
*/
CREATE OR REPLACE FUNCTION assort.copy_cluster_performance_attributes(new_plan_code integer, existing_plan_code integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
begin
	insert into assort.plan_performance_attributes (plan_code, attribute_name, score, rank, is_final) (select new_plan_code, attribute_name , score, rank, is_final from "assort".plan_performance_attributes where plan_code = existing_plan_code);
end;
$function$

;