
--liquibase formatted sql
--changeset rishabh.kumar@impactanalytics.co liquibase:copy_plan_level_aps_update  runOnChange:true stripComments:false splitStatements:false context:copy_plan_level_aps_update labels:liquibase_project_start
--comment: Update SP to copy plan data properly
--rollback: SELECT 1

DROP FUNCTION IF EXISTS assort_smart.copy_plan_level_aps(new_plan_code integer, existing_plan_code integer, source_plan_type text, dest_plan_type text);

CREATE OR REPLACE FUNCTION assort_smart.copy_plan_level_aps(new_plan_code integer, existing_plan_code integer, source_plan_type text, dest_plan_type text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare 
    _source_table_name text;
	_dest_table_name text;
begin
    _source_table_name := 'assort_smart.plan_hierarchy_aps_' || source_plan_type;
	_dest_table_name := 'assort_smart.plan_hierarchy_aps_' || dest_plan_type;

raise notice 'table name is %',
_source_table_name;

execute 'INSERT INTO ' || _dest_table_name || '(
	plan_code ,
	hierarchy_code ,
	season_code ,
	channel ,
	sub_channel ,
	moq ,
	st_ly ,
	st_ty ,
	aps_ly ,
	aps_ty ,
	max_cc ,
	min_cc ,
	cc_ly ,
	qty_ly ,
	qty_ty ,
	sales_unit_ly ,
	sales_unit_ty ,
	constraint_aps_ty ,
	forecast_units_ly ,
	forecast_units_ty ,
	all_door_cc ,
	cc_threshold ,
	avg_wk_cnt_ly ,
	avg_wk_cnt_ty ,
	min_cc_threshold ,
	all_door_cc_enabled,
	compare_type)
                    SELECT $1,
	hierarchy_code ,
	season_code ,
	channel ,
	sub_channel ,
	moq ,
	st_ly ,
	st_ty ,
	aps_ly ,
	aps_ty ,
	max_cc ,
	min_cc ,
	cc_ly ,
	qty_ly ,
	qty_ty ,
	sales_unit_ly ,
	sales_unit_ty ,
	constraint_aps_ty ,
	forecast_units_ly ,
	forecast_units_ty ,
	all_door_cc ,
	cc_threshold ,
	avg_wk_cnt_ly ,
	avg_wk_cnt_ty ,
	min_cc_threshold ,
	all_door_cc_enabled,
	compare_type
                    FROM ' || _source_table_name || ' WHERE plan_code = $2'
	using new_plan_code,
existing_plan_code;
end;

$function$
;