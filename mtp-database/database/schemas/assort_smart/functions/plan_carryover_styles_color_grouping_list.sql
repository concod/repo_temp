--liquibase formatted sql
--changeset liquibase:plan_carryover_styles_color_grouping_list runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:modify style carryover logic
--comment: modified logic for for plan_carryover_styles_color_grouping_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort_smart.plan_carryover_styles_color_grouping_list(input jsonb);
CREATE OR REPLACE FUNCTION assort_smart.plan_carryover_styles_color_grouping_list(input jsonb)
 RETURNS TABLE(plan_code integer, is_active boolean, levels jsonb, attribute_value jsonb)
 LANGUAGE plpgsql
AS $function$
 /*
 Function/Procedure name: assort_smart.plan_carryover_styles_color_grouping_list
 Created by: Hemant Kumar Singh
 Created at: 09-Jan-2023
 Update at: 	09-Jan-2023
 No of input parameter: 1
 Parameter Description : $1 = jsonb  ('{"filters":[{"attribute_name":"plan_code","value":[2361],"operator":"in"},{"attribute_name":"channel","value":["US","ECOMM","CA"],"prefix":"levels","operator":"in"},{"attribute_name":"is_active","value":["YES"],"operator":"in"}]}')
 
 Purpose: This function been created to get plan l3 aps details list for 2-1 screen 
  
 Calling Statement:
 SELECT assort_smart.plan_carryover_styles_color_grouping_list('{"filters":[{"attribute_name":"plan_code","value":[2361],"operator":"in"},{"attribute_name":"channel","value":["US","ECOMM","CA"],"prefix":"levels","operator":"in"},{"attribute_name":"is_active","value":["YES"],"operator":"in"}]}');
 
 Hemant Kumar SIngh: getting plan carryover styles color level list details
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
     	_where:=(select * from assort_smart.prepare_where_clause_from_json_filters(_filter_data) );
     
 		_query_combine := 'select plan_code,is_active ,jsonb_build_object(''l0_name'', l0_name,''l1_name'',l1_name,''l2_name'',l2_name,''l3_name'',l3_name,''channel'',channel,''style_color_id'',style_color_id,''style_id'',style_id) as levels,
 							jsonb_build_object(''store_codes'',store_codes,''st_ly'',st_ly,''st_ty'',st_ty,''aur_ly'',aur_ly,''aur_ty'',aur_ty,''cost_ly'',cost_ly,''cost_ty'',cost_ty,''sales_ly'',sales_ly,
 							''sales_ty'',sales_ty,''buy_units_ty'',buy_units_ty,''buy_units_ly'',buy_units_ly,''reg_weeks_ty'',reg_weeks_ty,''reg_weeks_ly'',reg_weeks_ly,
 							''sales_units_ly'',sales_units_ly,''sales_units_ty'',sales_units_ty,''gross_margin_ly'',gross_margin_ly,''gross_margin_ty'',gross_margin_ty,''retail_receipts_ty'',retail_receipts_ty,
 							''retail_receipts_ly'',retail_receipts_ly,''gross_margin_perc_ly'',gross_margin_perc_ly,''gross_margin_perc_ty'',gross_margin_perc_ty,
 							''ia_recommended_sales'',ia_recommended_sales,''ia_recommended_sales_units'',ia_recommended_sales_units,''aps_ly'',aps_ly,''aps_ty'',aps_ty,''ia_recommended_aur'',ia_recommended_aur,
							''style_description'',style_description,''color_description'',color_description,''fabrication'',fabrication,''clearance_date'',clearance_date,''retirement_date'',retirement_date,''is_locked'',is_locked,
							''is_edited_aur'',is_edited_aur,''is_edited_forecasted_units'',is_edited_forecasted_units) attribute_value 
 							from (
 							select plan_code,is_active,l0_name,l1_name,l2_name,l3_name,channel,style_color_id,style_id,style_description,color_description,fabrication,clearance_date,retirement_date,is_locked,is_edited_aur,is_edited_forecasted_units,
							(array_agg(store_code)) store_codes,avg(st_ly) st_ly,avg(st_ty) st_ty,avg(aur_ly) aur_ly,avg(aur_ty) aur_ty,avg(cost_ly) cost_ly,
 							avg(aps_ly) aps_ly,avg(aps_ty) aps_ty,avg(cost_ty) cost_ty,sum(sales_ly) sales_ly,sum(sales_ty) sales_ty,sum(buy_units_ty) buy_units_ty,sum(buy_units_ly) buy_units_ly, 
 							avg(reg_weeks_ty) reg_weeks_ty,avg(reg_weeks_ly) reg_weeks_ly,sum(sales_units_ly) sales_units_ly,sum(sales_units_ty) sales_units_ty,
 							sum(gross_margin_ly) gross_margin_ly,sum(gross_margin_ty) gross_margin_ty,sum(retail_receipts_ty) retail_receipts_ty,sum(retail_receipts_ly) retail_receipts_ly,
 							avg(gross_margin_perc_ly) gross_margin_perc_ly,avg(gross_margin_perc_ty) gross_margin_perc_ty,sum(ia_recommended_sales) ia_recommended_sales,sum(ia_recommended_sales_units) ia_recommended_sales_units ,
							avg(ia_recommended_aur) ia_recommended_aur from (
 							SELECT plan_code,is_active,(levels->>''l0_name'')::text l0_name, (levels->>''l1_name'')::text l1_name, (levels->>''l2_name'')::text l2_name,
 							(levels->>''l3_name'')::text l3_name,(levels->>''channel'')::text channel ,(levels->>''style_color_id'')::text style_color_id
 							,(levels->>''style_id'')::text style_id,(levels->>''store_code'')::text store_code,
 							(attribute_value->>''st_ly'')::float st_ly, (attribute_value->>''st_ty'')::float  st_ty, (attribute_value->>''aur_ly'')::float  aur_ly,
							(attribute_value->>''aps_ly'')::float aps_ly, (attribute_value->>''aps_ty'')::float  aps_ty,
 							(attribute_value->>''aur_ty'')::float  aur_ty, (attribute_value->>''cost_ly'')::float cost_ly, (attribute_value->>''cost_ty'')::float  cost_ty,
 							(attribute_value->>''sales_ly'')::float sales_ly,(attribute_value->>''sales_ty'')::float sales_ty,
 							(attribute_value->>''buy_units_ty'')::float buy_units_ty,(attribute_value->>''buy_units_ly'')::float buy_units_ly,
 							(attribute_value->>''reg_weeks_ty'')::float reg_weeks_ty,(attribute_value->>''reg_weeks_ly'')::float reg_weeks_ly,
 							(attribute_value->>''sales_units_ly'')::float sales_units_ly,(attribute_value->>''sales_units_ty'')::float sales_units_ty,
 							(attribute_value->>''gross_margin_ly'')::float gross_margin_ly,(attribute_value->>''gross_margin_ty'')::float gross_margin_ty,
 							(attribute_value->>''retail_receipts_ty'')::float retail_receipts_ty,(attribute_value->>''retail_receipts_ly'')::float retail_receipts_ly,
 							(attribute_value->>''gross_margin_perc_ly'')::float gross_margin_perc_ly,(attribute_value->>''gross_margin_perc_ty'')::float gross_margin_perc_ty,
 							(attribute_value->>''ia_recommended_sales'')::float ia_recommended_sales,(attribute_value->>''ia_recommended_sales_units'')::float ia_recommended_sales_units,
							(attribute_value->>''ia_recommended_aur'')::float ia_recommended_aur,(attribute_value->>''style_description'')::text style_description,
							(attribute_value->>''color_description'')::text color_description,(attribute_value->>''fabrication'')::text fabrication,
							(attribute_value->>''clearance_date'')::text clearance_date,(attribute_value->>''retirement_date'')::text retirement_date,
							(attribute_value->>''is_locked'')::boolean is_locked,(attribute_value->>''is_edited_aur'')::boolean is_edited_aur,
							(attribute_value->>''is_edited_forecasted_units'')::boolean is_edited_forecasted_units
 							FROM assort_smart.plan_carryover_styles
 							' || _where ||'
 							) as plan_bud 
 							group by 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17
							order by buy_units_ty desc
 							) final_temp';
 		raise notice '%', _query_combine;
 		RETURN QUERY execute _query_combine;
  	end
 $function$
;
