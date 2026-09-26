--liquibase formatted sql
--changeset mohammed.ayaz@impactanalytics.co:copy_plan_wedge_opt_master runOnChange:true stripComments:false splitStatements:false context:MTP-22756 labels:copy_plan_multi_flow
--comment: initial changeset for copy_plan_wedge_opt_master, fix copy plan for multiple flows
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort_smart.copy_plan_wedge_opt_master(new_plan_code integer, existing_plan_code integer);
/*
    Author : Mohammed Ayaz
    Date: 20-03-2023

    Copies plan wedge opt master data to new plan
*/

CREATE OR REPLACE FUNCTION assort_smart.copy_plan_wedge_opt_master(new_plan_code integer, existing_plan_code integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
begin
	insert into "assort_smart".plan_wedge_opt_master(plan_wedge_opt_id, plan_code, levels, attribute_value, parent_wedge_id, image_name_url)
		(SELECT  CONCAT(SPLIT_PART(plan_wedge_opt_id, '-', 1), '-', $1) plan_wedge_opt_id,  
                $1, levels,
                attribute_value, 
                CONCAT(SPLIT_PART(parent_wedge_id, '-', 1), '-', $1) parent_wedge_id,
                image_name_url 
                FROM "assort_smart".plan_wedge_opt_master
            where plan_code = $2);
end;
$function$

;