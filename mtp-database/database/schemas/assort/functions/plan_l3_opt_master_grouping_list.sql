--liquibase formatted sql
--changeset sadhanaj:update_query liquibase:update-query-MTP-44622 runOnChange:true stripComments:false splitStatements:false context:MTP-44622 labels:liquibase_project_start
--comment: MTP-44622
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort.plan_l3_opt_master_grouping_list(input jsonb);
CREATE OR REPLACE FUNCTION assort.plan_l3_opt_master_grouping_list(input jsonb)
 RETURNS TABLE(plan_code integer, is_active character varying, levels jsonb, attribute_value jsonb)
 LANGUAGE plpgsql
AS $function$
/*
Function/Procedure name: assort.plan_l3_opt_master_list
Created by: Hemant Kumar Singh
Created at: 31-Oct-2022
Update at: 31-Oct-2022
No of input parameter: 1
Parameter Description : jsonb
Purpose: This function been created to get l3 optimization details list for 2-1 screen

Calling Statement:
SELECT assort.plan_l3_opt_master_grouping_list('{"filters":[{"attribute_name":"plan_code","value":[1376],"operator":"in"},{"attribute_name":"channel","value":["Full Line Retail"],"prefix":"levels","operator":"in"},{"attribute_name":"is_active","value":["YES"],"operator":"in"}]}');


*/
declare
	_query_combine text;
	_where text;
	_input_data jsonb;
	_filter_data jsonb;
	begin
		_where:=null;
		_input_data:= $1::jsonb;
		_filter_data:=(_input_data->>'filters')::jsonb;

    	-- prepare where clause
    	_where:=(select * from assort.prepare_where_clause_from_json_filters(_filter_data) );

		_query_combine := 'select plan_code,is_active, jsonb_build_object(''l0_name'', l0_name,''l1_name'',l1_name,''l2_name'',l2_name,''l3_name'',l3_name,''sub_channel'',sub_channel,''channel'',channel,''drop'',drop) as levels,
							jsonb_build_object(''air_ly'',air_ly,''air_ty'',air_ty, ''txn_aur_ty'',txn_aur_ty,
''txn_aur_ly'',txn_aur_ly,
							''aur_ly'',aur_ly,''aur_without_filters'',budget_ly/(nullif(receipts_quantity_ly, 0)),''aur_ty'',budget_ty/(nullif(receipts_quantity_ty, 0)),''imu_ly'',imu_ly,''imu_ty'',imu_ty,''cogs_ly'',cogs_ly,''msrp_ly'',msrp_ly,
							''existing'',existing,''budget_ly'',budget_ly,''budget_ty'',budget_ty,''margin_ly'',margin_ly,''budget_diff'',budget_diff,''st_without_filters'',sell_through,''penetration_ly'',new_penetration_ly,
							''penetration_ty'',new_penetration_ty,''cost_budget_diff'',cost_budget_diff,''penetration_diff'',((penetration_ty-penetration_ly)/(nullif(penetration_ly, 0))),''l2_drop_budget_ly'',l2_drop_budget_ly,''l2_drop_budget_ty'',l2_drop_budget_ty,
							''margin_perc_without_filters'',margin_percentage,''receipts_quantity_ly'',receipts_quantity_ly,''receipts_quantity_without_filters'',receipts_quantity_ly,''receipts_quantity_ty'',receipts_quantity_ty,''total_receipts_cost_ty'',total_receipts_cost_ty,''total_receipts_cost_without_filters'',total_receipts_cost_ly,
							''total_available_cost_ly'',total_available_cost_ly,''total_receipts_price_ty'',total_receipts_price_ty,''total_receipts_price_without_filters'',total_receipts_price_ly,''store_eligibility_groups'',store_eligibility_groups,''revenue_without_filters'',revenue_ly,''revenue_ty'',revenue_ty,''forecast_units_ty'',forecast_units_ty,''total_quantity_without_filters'',forecast_units_ly) attribute_value
							from (
							select plan_code,is_active,drop,l0_name,l1_name,l2_name,l3_name,(array_agg(sub_channel order by sub_channel)) sub_channel,((array_agg(channel order by channel))) channel,
							avg(air_ly) air_ly, avg(air_ty) air_ty, avg(aur_ly) aur_ly,
							avg(txn_aur_ly) txn_aur_ly,
							avg(txn_aur_ty) txn_aur_ty,
							 avg(aur_ty) aur_ty,avg(imu_ly) imu_ly, avg(imu_ty) imu_ty, sum(cogs_ly) cogs_ly , avg(msrp_ly) msrp_ly ,
							(array_agg(existing))[1] existing,sum(budget_ly) budget_ly, sum(budget_ty) budget_ty, sum(margin_ly) margin_ly, sum(budget_diff) budget_diff,
							case when sum(total_receipts_price_ty)=0 then avg(sell_through) else sum(total_receipts_price_ty*sell_through)/sum(total_receipts_price_ty) end sell_through, avg(penetration_ly) penetration_ly,
							avg(penetration_ty) penetration_ty, sum(cost_budget_diff) cost_budget_diff, avg(penetration_diff) penetration_diff, sum(l2_drop_budget_ly) l2_drop_budget_ly,
							sum(l2_drop_budget_ty) l2_drop_budget_ty, avg(margin_percentage) margin_percentage, sum(receipts_quantity_ly) receipts_quantity_ly,sum(receipts_quantity_ty) receipts_quantity_ty, sum(total_receipts_cost_ty) total_receipts_cost_ty,sum(total_receipts_cost_ly) total_receipts_cost_ly,
							sum(total_available_cost_ly) total_available_cost_ly, sum(total_receipts_price_ty) total_receipts_price_ty, sum(total_receipts_price_ly) total_receipts_price_ly,(array_agg(store_eligibility_groups))[1] store_eligibility_groups,sum(revenue_ly) revenue_ly, sum(revenue_ty) revenue_ty,
							sum(forecast_units_ty) forecast_units_ty,sum(forecast_units_ly) forecast_units_ly,
							COALESCE(
								NULLIF(SUM(SUM(budget_ly)) OVER (PARTITION BY plan_code, l0_name, l1_name, l2_name, l3_name,  drop), 0) /
								NULLIF(SUM(SUM(budget_ly)) OVER (PARTITION BY plan_code, l0_name, l1_name, l2_name,drop), 0),0) as new_penetration_ly,
							COALESCE(
								NULLIF(SUM(SUM(budget_ty)) OVER (PARTITION BY plan_code, l0_name, l1_name, l2_name, l3_name,  drop), 0) /
								NULLIF(SUM(SUM(budget_ty)) OVER (PARTITION BY plan_code, l0_name, l1_name, l2_name, drop), 0),0) as new_penetration_ty
							from (
							select plan_code, (levels->>''drop'')::text drop,(levels->>''l0_name'')::text l0_name,
							(levels->>''l1_name'')::text l1_name, (levels->>''l2_name'')::text l2_name,(levels->>''l3_name'')::text l3_name,
							(levels->>''channel'')::text channel ,(levels->>''sub_channel'')::text sub_channel,is_active,
							(attribute_value->>''air_ly'')::float air_ly , (attribute_value->>''air_ty'')::float air_ty,
							(attribute_value->>''aur_ly'')::float aur_ly,
							(attribute_value->>''aur_ty'')::float aur_ty,
							(attribute_value->>''txn_aur_ly'')::float txn_aur_ly,
							(attribute_value->>''txn_aur_ty'')::float txn_aur_ty,
							(attribute_value->>''imu_ly'')::float imu_ly,(attribute_value->>''imu_ty'')::float imu_ty,(attribute_value->>''cogs_ly'')::float cogs_ly,(attribute_value->>''msrp_ly'')::float msrp_ly,
							(attribute_value->>''existing'')::text  existing,(attribute_value->>''budget_ly'')::float budget_ly,(attribute_value->>''budget_ty'')::float budget_ty,(attribute_value->>''margin_ly'')::float margin_ly,
							(attribute_value->>''budget_diff'')::float budget_diff,(attribute_value->>''sell_through'')::float sell_through,(attribute_value->>''penetration_ly'')::float penetration_ly,
							(attribute_value->>''penetration_ty'')::float penetration_ty,(attribute_value->>''cost_budget_diff'')::float cost_budget_diff,(attribute_value->>''penetration_diff'')::float penetration_diff,
							(attribute_value->>''l2_drop_budget_ly'')::float l2_drop_budget_ly,(attribute_value->>''l2_drop_budget_ty'')::float l2_drop_budget_ty,
							(attribute_value->>''margin_percentage'')::float margin_percentage,(attribute_value->>''receipts_quantity_ly'')::float receipts_quantity_ly,
							(attribute_value->>''receipts_quantity_op'')::float receipts_quantity_op,(attribute_value->>''receipts_quantity_ty'')::float receipts_quantity_ty,(attribute_value->>''total_receipts_cost_ly'')::float total_receipts_cost_ly,
							(attribute_value->>''total_receipts_cost_ty'')::float total_receipts_cost_ty,(attribute_value->>''total_available_cost_ly'')::float total_available_cost_ly,
							(attribute_value->>''total_receipts_price_ty'')::float total_receipts_price_ty,(attribute_value->>''store_eligibility_groups'')::text store_eligibility_groups,
							(attribute_value->>''total_receipts_price_ly'')::float total_receipts_price_ly,(attribute_value->>''revenue_ly'')::float revenue_ly,(attribute_value->>''revenue_ty'')::float revenue_ty,
							(attribute_value->>''forecast_units_ty'')::float forecast_units_ty,(attribute_value->>''forecast_units_ly'')::float forecast_units_ly
							from assort.plan_l3_opt_master
							' || _where ||'
							order by levels->>''l0_name'',levels->>''l1_name'',levels->>''l2_name'',levels->>''l3_name'',levels->>''drop'',levels->>''channel'',levels->>''sub_channel''
							) temp_table
							group by 1,2,3,4,5,6,7
							) final_temp';
		raise notice '%', _query_combine;
		RETURN QUERY execute _query_combine;
 	end
$function$
;