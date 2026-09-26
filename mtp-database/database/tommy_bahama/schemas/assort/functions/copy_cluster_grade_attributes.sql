--liquibase formatted sql
--changeset liquibase:copy_cluster_grade_attributes runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for copy_cluster_grade_attributes
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort.copy_cluster_grade_attributes(new_plan_code integer, existing_plan_code integer);
/*
    Author : Pradeep Nayak
    Date: 08-03-2022

    Copies cluster grade data to new plan
*/

CREATE OR REPLACE FUNCTION assort.copy_cluster_grade_attributes(new_plan_code integer, existing_plan_code integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
begin
       insert into "assort".plan_cluster_grade_attributes (plan_code, store_code, special_classification, attribute_name, attribute_value) 
       ( select new_plan_code, store_code, special_classification, attribute_name, attribute_value from "assort".plan_cluster_grade_attributes
       		where plan_code = existing_plan_code);	
end;
$function$

;