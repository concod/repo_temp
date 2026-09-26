--liquibase formatted sql
--changeset mohammed.ayaz@impactanalytics.co:copy_plan_attributes runOnChange:true stripComments:false splitStatements:false context:MTP-35045 labels:copy_plan_attribute_fix
--comment: initial changeset for copy_plan_attributes- fix schema for copy_plan_attributes
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort_smart.copy_plan_attributes(new_plan_code integer, existing_plan_code integer);
/*
    Author : Pradeep Nayak
    Date: 08-03-2022

    Copies plan attributes to new plan
    Updated by: Mohammed Ayaz
    Changes: moved to assort_smart schema
*/
CREATE OR REPLACE FUNCTION assort_smart.copy_plan_attributes(new_plan_code integer, existing_plan_code integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
begin
	insert into "assort_smart".plan_attributes (plan_code, attribute_name, attribute_value) (select $1, attribute_name , attribute_value from "assort_smart".plan_attributes where plan_code = existing_plan_code);
end;
$function$

;