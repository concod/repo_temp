

--liquibase formatted sql
--changeset rishabh.kumar@impactanalytics.co liquibase:copy_plan_cluster_aps_update  runOnChange:true stripComments:false splitStatements:false context:copy_plan_cluster_aps_update labels:liquibase_project_start
--comment: Update cluster SP to copy data properly
--rollback: SELECT 1

DROP FUNCTION IF EXISTS assort_smart.copy_plan_cluster_aps(new_plan_code integer, existing_plan_code integer, source_plan_type text, dest_plan_type text);

CREATE OR REPLACE FUNCTION assort_smart.copy_plan_cluster_aps(new_plan_code integer, existing_plan_code integer, source_plan_type text, dest_plan_type text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare 
    _source_table_name text;
	_dest_table_name text;
begin
    _source_table_name := 'assort_smart.plan_cluster_aps_' || source_plan_type;
	_dest_table_name := 'assort_smart.plan_cluster_aps_' || dest_plan_type;

raise notice 'table name is %',
_source_table_name;

execute 'INSERT INTO ' || _dest_table_name || '(plan_code ,
	hierarchy_code ,
	channel ,
	sub_channel ,
	cluster_code ,
	cluster_display_name ,
	is_final ,
	st_ly ,
	st_ty ,
	aps_ly ,
	aps_ty ,
	max_cc ,
	min_cc ,
	cc_threshold ,
	avg_wk_cnt_ly ,
	avg_wk_cnt_ty ,
	aps_cluster_ratio ,
	moq ,
	qty_ly ,
	qty_ty ,
	avg_wk_ty_changed ,
	st_clust_ty_changed ,
	constraint_aps_ty ,
	aps_ty_changed ,
	compare_type,
	season_code)
                    SELECT $1, 
	hierarchy_code ,
	channel ,
	sub_channel ,
	cluster_code ,
	cluster_display_name ,
	is_final ,
	st_ly ,
	st_ty ,
	aps_ly ,
	aps_ty ,
	max_cc ,
	min_cc ,
	cc_threshold ,
	avg_wk_cnt_ly ,
	avg_wk_cnt_ty ,
	aps_cluster_ratio ,
	moq ,
	qty_ly ,
	qty_ty ,
	avg_wk_ty_changed ,
	st_clust_ty_changed ,
	constraint_aps_ty ,
	aps_ty_changed ,
	compare_type,
	season_code
                    FROM ' || _source_table_name || ' WHERE plan_code = $2'
	using new_plan_code,
existing_plan_code;
end;

$function$
;