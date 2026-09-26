--liquibase formatted sql
--changeset liquibase:copy_cluster_plan_attributes runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for copy_cluster_plan_attributes
--rollback: SELECT 1
DROP FUNCTION IF EXISTS cluster_smart.copy_plan_attributes(new_cluster_plan_code integer, existing_cluster_plan_code integer);
/*
    Author : Mohammed Ayaz
    Date: 21-03-2023

    Copies cluster plan attributes to new  cluster plan
*/
CREATE OR REPLACE FUNCTION cluster_smart.copy_plan_attributes(new_cluster_plan_code integer, existing_cluster_plan_code integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
begin
	insert into cluster_smart.cluster_plan_attributes (cluster_plan_code, attribute_name, attribute_value) (select $1, attribute_name , attribute_value from "cluster_smart".cluster_plan_attributes where cluster_plan_code = existing_cluster_plan_code);
end;
$function$

;