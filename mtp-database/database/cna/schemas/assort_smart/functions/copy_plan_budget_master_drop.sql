

--liquibase formatted sql
--changeset chitrakumari.singh@impactanalytics.co liquibase:update_sp_to_copy_plan_master_drop runOnChange:true stripComments:false splitStatements:false context:update_sp_to_copy_plan_master_drop labels:liquibase_project_start
--comment: Update SP to copy master plan
--rollback: SELECT 1

 DROP FUNCTION IF EXISTS assort_smart.copy_plan_budget_master_drop(new_plan_code integer, existing_plan_code integer, source_plan_type text, dest_plan_type text);


CREATE OR REPLACE FUNCTION assort_smart.copy_plan_budget_master_drop(new_plan_code integer, existing_plan_code integer, source_plan_type text, dest_plan_type text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare 
    _source_table_name text;
    _dest_table_name text;
begin
    _source_table_name := 'assort_smart.plan_budget_master_drop_' || source_plan_type;
    _dest_table_name := 'assort_smart.plan_budget_master_drop_' || dest_plan_type;


raise notice 'table name is %',
_source_table_name;

execute 'INSERT INTO ' || _dest_table_name || '(
    plan_code, 
    hierarchy_code, 
    channel, 
    sub_channel, 
    launch_id, 
    launch_budget_ly, 
    launch_budget_ty, 
    launch_penetration_ly, 
    launch_penetration_ty, 
    total_budget_ty, 
    total_budget_ly, 
    total_penetration_ly, 
    total_penetration_ty, 
    delivery_1_penetration_ly, 
    delivery_1_penetration_ty, 
    delivery_2_penetration_ly, 
    delivery_2_penetration_ty, 
    delivery_3_penetration_ly, 
    delivery_3_penetration_ty, 
    delivery_4_penetration_ly, 
    delivery_4_penetration_ty, 
    delivery_5_penetration_ly, 
    delivery_5_penetration_ty, 
    delivery_6_penetration_ly, 
    delivery_6_penetration_ty, 
    delivery_7_penetration_ly, 
    delivery_7_penetration_ty, 
    delivery_8_penetration_ly, 
    delivery_8_penetration_ty, 
    delivery_9_penetration_ly, 
    delivery_9_penetration_ty, 
    delivery_10_penetration_ly, 
    delivery_10_penetration_ty, 
    delivery_11_penetration_ly, 
    delivery_11_penetration_ty, 
    delivery_12_penetration_ly, 
    delivery_12_penetration_ty)
    SELECT $1, 
    hierarchy_code, 
    channel, 
    sub_channel, 
    launch_id, 
    launch_budget_ly, 
    launch_budget_ty, 
    launch_penetration_ly, 
    launch_penetration_ty, 
    total_budget_ty, 
    total_budget_ly, 
    total_penetration_ly, 
    total_penetration_ty, 
    delivery_1_penetration_ly, 
    delivery_1_penetration_ty, 
    delivery_2_penetration_ly, 
    delivery_2_penetration_ty, 
    delivery_3_penetration_ly, 
    delivery_3_penetration_ty, 
    delivery_4_penetration_ly, 
    delivery_4_penetration_ty, 
    delivery_5_penetration_ly, 
    delivery_5_penetration_ty, 
    delivery_6_penetration_ly, 
    delivery_6_penetration_ty, 
    delivery_7_penetration_ly, 
    delivery_7_penetration_ty, 
    delivery_8_penetration_ly, 
    delivery_8_penetration_ty, 
    delivery_9_penetration_ly, 
    delivery_9_penetration_ty, 
    delivery_10_penetration_ly, 
    delivery_10_penetration_ty, 
    delivery_11_penetration_ly, 
    delivery_11_penetration_ty, 
    delivery_12_penetration_ly, 
    delivery_12_penetration_ty
    FROM ' || _source_table_name || ' WHERE plan_code = $2'
    using new_plan_code, existing_plan_code;
end;
$function$
;

