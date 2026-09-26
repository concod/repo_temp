
--liquibase formatted sql
--changeset rishabh.kumar@impactanalytics.co liquibase:copy_plan_new_class_master_update  runOnChange:true stripComments:false splitStatements:false context:copy_plan_new_class_master_update labels:liquibase_project_start
--comment: Update SP to copy data properly
--rollback: SELECT 1

DROP FUNCTION IF EXISTS assort_smart.copy_plan_new_class_master(new_plan_code integer, existing_plan_code integer, source_plan_type text, dest_plan_type text);

CREATE OR REPLACE FUNCTION assort_smart.copy_plan_new_class_master(new_plan_code integer, existing_plan_code integer, source_plan_type text, dest_plan_type text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$

declare 
    _source_table_name text;
	_dest_table_name text;
begin
    _source_table_name := 'assort_smart.plan_new_hierarchy_' || source_plan_type;
	_dest_table_name := 'assort_smart.plan_new_hierarchy_' || dest_plan_type;

raise notice 'table name is %',
_source_table_name;

execute 'INSERT INTO ' || _dest_table_name || '(plan_code, 
	created_at, 
	updated_at, 
	aur_ly ,
	aur_ty ,
	budget_ly ,
	budget_ty ,
	revenue_ly ,
    revenue_ty ,
    txn_aur_ly ,
    txn_aur_ty ,
    budget_diff ,
    l2_budget_ty ,
    sell_through ,
    penetration_ly ,
    penetration_ty ,
    penetration_diff ,
    receipts_quantity_ly ,
    receipts_quantity_ty ,
    total_available_cost_ly ,
    total_available_quantity_ly ,
	style_code,
	hierarchy_code,
	channel_code,
	season_code )
                    SELECT $1,  
	created_at, 
	updated_at, 
	aur_ly ,
	aur_ty ,
	budget_ly ,
	budget_ty ,
	revenue_ly ,
    revenue_ty ,
    txn_aur_ly ,
    txn_aur_ty ,
    budget_diff ,
    l2_budget_ty ,
    sell_through ,
    penetration_ly ,
    penetration_ty ,
    penetration_diff ,
    receipts_quantity_ly ,
    receipts_quantity_ty ,
    total_available_cost_ly ,
    total_available_quantity_ly ,
	style_code,
	hierarchy_code,
	channel_code,
	season_code
                    FROM ' || _source_table_name || ' WHERE plan_code = $2'
	using new_plan_code,
existing_plan_code;
end;

$function$
;