
--liquibase formatted sql
--changeset chitrakumari.singh@impactanalytics.co liquibase:copy_plan_cluster_depth_choice_update_remove_launch  runOnChange:true stripComments:false splitStatements:false context:copy_plan_cluster_depth_choice_update_remove_launch labels:liquibase_project_start
--comment: Update SP to copy plan data properly
--rollback: SELECT 1

DROP FUNCTION IF EXISTS assort_smart.copy_plan_cluster_depth_choice(new_plan_code integer, existing_plan_code integer, source_plan_type text, dest_plan_type text);

CREATE OR REPLACE FUNCTION assort_smart.copy_plan_cluster_depth_choice(new_plan_code integer, existing_plan_code integer, source_plan_type text, dest_plan_type text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare 
    _source_table_name text;
    _dest_table_name text;
begin
    _source_table_name := 'assort_smart.plan_cluster_depth_choice_' || source_plan_type;
    _dest_table_name := 'assort_smart.plan_cluster_depth_choice_' || dest_plan_type;

raise notice 'table name is %',
_source_table_name;

execute 'INSERT INTO ' || _dest_table_name || '(
    plan_code ,
    hierarchy_code ,
    season_code ,
    channel ,
    sub_channel ,
    cluster_code ,
    cluster_display_name ,
    max_cc ,
    qty_ty ,
    depth_ly ,
    depth_ty ,
    choice_ly ,
    choice_ty ,
    store_cnt ,
    cc_threshold ,
    total_choice_count_ly ,
    total_choice_count_ty ,
    compare_type,
    total_depth_ly,
    total_depth_ty)
                    SELECT $1,
    hierarchy_code ,
    season_code ,
    channel ,
    sub_channel ,
    cluster_code ,
    cluster_display_name ,
    max_cc ,
    qty_ty ,
    depth_ly ,
    depth_ty ,
    choice_ly ,
    choice_ty ,
    store_cnt ,
    cc_threshold ,
    total_choice_count_ly ,
    total_choice_count_ty ,
    compare_type,
    total_depth_ly,
    total_depth_ty 
                    FROM ' || _source_table_name || ' WHERE plan_code = $2'
    using new_plan_code,
existing_plan_code;
end;

$function$
;
