--liquibase formatted sql
--changeset hemant.kumar@impactanalytics.co:assort_smart.plan_budget_master_grouping_list sp liquibase:plan_budget_master_grouping_list runOnChange:true stripComments:false splitStatements:false context:sp plan_budget_master_grouping_list labels:liquibase_project_start
--comment: initial changeset for plan_budget_master_grouping_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort_smart.plan_budget_master_grouping_list(input jsonb);
CREATE OR REPLACE FUNCTION assort_smart.plan_budget_master_grouping_list(input jsonb)
 RETURNS TABLE(plan_code integer, levels jsonb, attribute_value jsonb)
 LANGUAGE plpgsql
AS $function$
/*
Function/Procedure name: assort_smart.plan_budget_master_grouping_list
Created by: Hemant Kumar Singh
Created at: 7-Nov-2022
Update at: 7-Nov-2022
No of input parameter: 1
Parameter Description : $1,$2 = jsonb  ('{"filters":[{"attribute_name":"plan_code","value":[2361],"operator":"in"},
							{"attribute_name":"channel","value":["US","ECOMM","CA"],"prefix":"levels","operator":"in"},
							{"attribute_name":"is_active","value":["YES"],"operator":"in"}]}')

Purpose: This function been created to get plan l3 aps details list for 2-1 screen 
 
Calling Statement:
SELECT assort_smart.plan_budget_master_grouping_list('{"filters":[{"attribute_name":"plan_code","value":[2361]
,"operator":"in"},{"attribute_name":"channel","value":["US","ECOMM","CA"],"prefix":"levels","operator":"in"},
{"attribute_name":"is_active","value":["YES"],"operator":"in"}]}');

Hemant Kumar SIngh: getting plan budget master list details
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
    
		_query_combine := 'select plan_code ,jsonb_build_object(''l0_name'', l0_name,''l1_name'',l1_name,''l2_name'',l2_name,''sub_channel'',sub_channel,''channel'',channel) as levels,
							jsonb_build_object(''units_ly'',units_ly,''units_ty'',units_ty,''margin_ly'',margin_ly,''margin_ty'',margin_ty,''revenue_ly'',revenue_ly,''revenue_ty'',revenue_ty,''receipt_units_ly'',receipt_units_ly,''receipt_units_ty'',receipt_units_ty,
							''retail_receipt_ly'',retail_receipt_ly,''retail_receipt_ty'',retail_receipt_ty) attribute_value 
							from (
							select plan_code,l0_name,l1_name,l2_name, (array_agg(sub_channel)) sub_channel,(array_agg(channel)) channel,
							sum(units_ly) units_ly,sum(units_ty) units_ty,sum(margin_ly) margin_ly,sum(margin_ty) margin_ty,sum(revenue_ly) revenue_ly,sum(revenue_ty) revenue_ty,
							sum(receipt_units_ly) receipt_units_ly,sum(receipt_units_ty) receipt_units_ty,sum(retail_receipt_ly) retail_receipt_ly,sum(retail_receipt_ty) retail_receipt_ty
							 from (
							SELECT plan_code,(levels->>''l0_name'')::text l0_name, (levels->>''l1_name'')::text l1_name, (levels->>''l2_name'')::text l2_name,(levels->>''channel'')::text channel ,(levels->>''sub_channel'')::text sub_channel,
							(attribute_value->>''units_ly'')::float units_ly, (attribute_value->>''units_ty'')::float  units_ty, (attribute_value->>''margin_ly'')::float  margin_ly,
							(attribute_value->>''margin_ty'')::float  margin_ty, (attribute_value->>''revenue_ly'')::float revenue_ly, (attribute_value->>''revenue_ty'')::float  revenue_ty,
							(attribute_value->>''receipt_units_ly'')::float receipt_units_ly,(attribute_value->>''receipt_units_ty'')::float receipt_units_ty,
							(attribute_value->>''retail_receipt_ly'')::float retail_receipt_ly,(attribute_value->>''retail_receipt_ty'')::float retail_receipt_ty
							FROM assort_smart.plan_budget_master
							' || _where ||'
							) as plan_bud 
							group by 1,2,3,4
							) final_temp';
		raise notice '%', _query_combine;
		RETURN QUERY execute _query_combine;
 	end
$function$
;
