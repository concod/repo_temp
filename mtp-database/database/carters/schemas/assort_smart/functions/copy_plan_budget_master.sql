
--liquibase formatted sql
--changeset rishabh.kumar@impactanalytics.co liquibase:remove_target_column runOnChange:true  stripComments:false splitStatements:false context:remove_target_column labels:liquibase_project_start
--comment: Remove target column
--rollback: SELECT 1

DROP FUNCTION IF EXISTS assort_smart.copy_plan_budget_master(new_plan_code integer, existing_plan_code integer, source_plan_type text, dest_plan_type text);


CREATE OR REPLACE FUNCTION assort_smart.copy_plan_budget_master(new_plan_code integer, existing_plan_code integer, source_plan_type text, dest_plan_type text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare 
    _source_table_name text;
	_dest_table_name text;
begin
    _source_table_name := 'assort_smart.plan_budget_master_' || source_plan_type;
	_dest_table_name := 'assort_smart.plan_budget_master_' || dest_plan_type;

raise notice 'table name is new %',
_source_table_name;

execute 'INSERT INTO ' || _dest_table_name || '(plan_code, hierarchy_code, channel, sub_channel, units_ty, margin_ty, retail_receipt_ty, receipt_units_ty, revenue_ty, units_ly, margin_ly, retail_receipt_ly, receipt_units_ly, revenue_ly, 
					sales_cost_ty, compare_type, season_code)
                    SELECT $1,  hierarchy_code, channel, sub_channel, units_ty, margin_ty, retail_receipt_ty, receipt_units_ty, revenue_ty, units_ly, margin_ly, retail_receipt_ly, receipt_units_ly, revenue_ly, sales_cost_ty,
					compare_type, season_code
                    FROM ' || _source_table_name || ' WHERE plan_code = $2'
	using new_plan_code,
existing_plan_code;
end;

$function$
;
