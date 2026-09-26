--liquibase formatted sql
--changeset liquibase:plan_carryover_perc_view runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_carryover_perc_view
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort_smart.plan_carryover_perc_view(input integer);
CREATE OR REPLACE FUNCTION assort_smart.plan_carryover_perc_view(input integer)
 RETURNS TABLE(tag text, sales double precision, sales_units double precision, gross_margin double precision, retail_receipts double precision, sales_per double precision, sales_units_per double precision, gross_margin_per double precision, retail_receipts_per double precision)
 LANGUAGE plpgsql
AS $function$
 /*
 Function/Procedure name: assort_smart.plan_carryover_perc_view
 Created by: Hemant Kumar Singh
 Created at: 1-Feb-2023
 Update at: 1-Feb-2023
 No of input parameter: 1
 Parameter Description : $1 = plan code 
 
 Purpose: This function been created to getting plan carryover percentage view details.
  
 Calling Statement:
 SELECT assort_smart.plan_carryover_perc_view(1806);
 
 Hemant Kumar SIngh: getting plan carryover percentage view details.
 */
 declare
 	_query_combine text;
 	begin
 		_query_combine := 'select plan_budget.*, plan_budget.revenue/(nullif(plan_carryover.revenue, 0)) as sales_per, plan_budget.sales_units/(nullif(plan_carryover.sales_units, 0)) as sales_units_per, plan_budget.gross_margin/(nullif(plan_carryover.gross_margin, 0)) as gross_margin_per, plan_budget.retail_receipts/(nullif(plan_carryover.retail_receipts, 0)) as retail_receipts_per
 							from
 							(select ''Total'' as tag, sum((attribute_value ->> ''revenue_ty''):: float) as revenue, sum((attribute_value ->> ''units_ty'')::float) as sales_units, sum((attribute_value ->> ''margin_ty'')::float) as gross_margin,
 							 sum((attribute_value ->> ''retail_receipt_ty''):: float) as retail_receipts
 							from assort_smart.plan_budget_master pbm
 							where plan_code = ' || $1 ||'
 							union
 							select ''Carryover'' as tag, sum((attribute_value ->> ''sales_ty''):: float) as revenue, sum((attribute_value ->> ''sales_units_ty'')::float) as sales_units, sum((attribute_value ->> ''gross_margin_ty'')::float) as gross_margin
 							, sum((attribute_value ->> ''retail_receipts_ty''):: float) as retail_receipts
 							from assort_smart.plan_carryover_styles
 							where plan_code = ' || $1 ||' and is_active = ''false''
 							union
 							select ''New'' as tag, plan_budget.revenue - plan_carryover.revenue as sales, plan_budget.sales_units-plan_carryover.sales_units as sales_units,plan_budget. gross_margin- plan_carryover. gross_margin as gross_margin,
 							plan_budget. retail_receipts-plan_carryover.retail_receipts as retail_receipts
 							from
 							(select 1 as key, sum((attribute_value ->> ''revenue_ty''):: float) as revenue, sum((attribute_value ->> ''units_ty'')::float) as sales_units, sum((attribute_value ->> ''margin_ty'')::float) as gross_margin,
 							 sum((attribute_value ->> ''retail_receipt_ty''):: float) as retail_receipts
 							from assort_smart.plan_budget_master pbm
 							where plan_code = ' || $1 ||') as plan_budget
 							join
 							(select 1 as key, sum((attribute_value ->> ''sales_ty''):: float) as revenue, sum((attribute_value ->> ''sales_units_ty'')::float) as sales_units, sum((attribute_value ->> ''gross_margin_ty'')::float) as gross_margin
 							, sum((attribute_value ->> ''retail_receipts_ty''):: float) as retail_receipts
 							from assort_smart.plan_carryover_styles
 							where plan_code = ' || $1 ||' and is_active = ''false'') as plan_carryover
 							using(key)) as plan_budget
 							cross join
 							(select 1 as key, sum((attribute_value ->> ''revenue_ty''):: float) as revenue, sum((attribute_value ->> ''units_ty'')::float) as sales_units, sum((attribute_value ->> ''margin_ty'')::float) as gross_margin,
 							 sum((attribute_value ->> ''retail_receipt_ty''):: float) as retail_receipts
 							from assort_smart.plan_budget_master pbm
 							where plan_code = ' || $1 ||') as plan_carryover
							order by tag ';
 		raise notice '%', _query_combine;
 		RETURN QUERY execute _query_combine;
  	end
 $function$
;
