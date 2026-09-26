--liquibase formatted sql
--changeset liquibase:copy_cluster_grade_attributes runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for copy_cluster_grade_attributes
--rollback: SELECT 1
DROP FUNCTION IF EXISTS cluster_smart.copy_cluster_grade_attributes(new_cluster_plan_code integer, existing_cluster_plan_code integer);
CREATE OR REPLACE FUNCTION cluster_smart.copy_cluster_grade_attributes(new_cluster_plan_code integer, existing_cluster_plan_code integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
/*
    Author : Mohammed Ayaz
    Date: 22-03-2023

    Copies cluster grade data to new cluster plan
*/
begin
       insert into "cluster_smart".plan_cluster_grade_attributes (cluster_plan_code, store_code, special_classification, attribute_name, attribute_value) 
       ( select $1, store_code, special_classification, attribute_name, attribute_value from "cluster_smart".plan_cluster_grade_attributes
       		where cluster_plan_code = existing_cluster_plan_code);	
end;
$function$
;
