
--liquibase formatted sql
--changeset liquibase:copy_plan_store_attributes runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for copy_plan_store_attributes
--rollback: SELECT 1
DROP FUNCTION IF EXISTS cluster_smart.copy_plan_store_attributes(new_cluster_plan_code integer, existing_cluster_plan_code integer);
/*
    Author : Mohammed Ayaz
    Date: 21-03-2023

    Copies cluster store plan attributes to new  cluster plan
    NOTE: named this file "cluster"_plan_store_attributes.sql to avoid confusion with assort_plan
    Table name is "plan_store_attributes"
*/
CREATE OR REPLACE FUNCTION cluster_smart.copy_plan_store_attributes(new_cluster_plan_code integer, existing_cluster_plan_code integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
begin
	insert into cluster_smart.plan_store_attributes(cluster_plan_code, attribute_name, is_primary, is_final, levels) (select $1, attribute_name , is_primary, is_final, levels from "cluster_smart".plan_store_attributes where cluster_plan_code = existing_cluster_plan_code);
end;
$function$

;