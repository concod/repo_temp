--liquibase formatted sql
--changeset sadhana.j:added_levels_cols runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: added_levels_cols
--rollback: SELECT 1
DROP FUNCTION IF EXISTS cluster_smart.copy_cluster_performance_attributes(new_cluster_plan_code integer, existing_cluster_plan_code integer);
/*
    Author : Mohammed Ayaz
    Date: 22-03-2023

    Copies cluster grade data to new plan
*/
CREATE OR REPLACE FUNCTION cluster_smart.copy_cluster_performance_attributes(new_cluster_plan_code integer, existing_cluster_plan_code integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
begin
	insert into cluster_smart.plan_performance_attributes (cluster_plan_code, attribute_name, score, rank, is_final, levels) (select $1, attribute_name , score, rank, is_final, levels from "cluster_smart".plan_performance_attributes where cluster_plan_code = existing_cluster_plan_code);
end;
$function$

;