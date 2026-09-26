--liquibase formatted sql
--changeset liquibase:copy_cluster_product_attributes runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for copy_cluster_product_attributes
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort.copy_cluster_product_attributes(new_plan_code integer, existing_plan_code integer);
/*
    Author : Pradeep Nayak
    Date: 08-03-2022

    Copies cluster grade data to new plan
*/
CREATE OR REPLACE FUNCTION assort.copy_cluster_product_attributes(new_plan_code integer, existing_plan_code integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
begin
	insert into assort.plan_product_attributes (plan_code, attribute_name, is_primary, is_final) (select $1, attribute_name , is_primary, is_final from "assort".plan_product_attributes where plan_code = existing_plan_code);
end;
$function$

;