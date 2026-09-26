--liquibase formatted sql
--changeset liquibase:plan_budget_master_grouping_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_budget_master_grouping_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort.plan_budget_master_grouping_list(input jsonb);
CREATE OR REPLACE FUNCTION assort.plan_budget_master_grouping_list(input jsonb)
 RETURNS TABLE(plan_code integer, levels jsonb, attribute_value jsonb)
 LANGUAGE plpgsql
AS $function$
/*
Function/Procedure name: assort.plan_budget_master_grouping_list
Created by: Hemant Kumar Singh
Created at: 7-Nov-2022
Update at: 7-Nov-2022
No of input parameter: 1
Parameter Description : $1,$2 = jsonb  ('{"filters":[{"attribute_name":"plan_code","value":[2361],"operator":"in"},{"attribute_name":"channel","value":["US","ECOMM","CA"],"prefix":"levels","operator":"in"},{"attribute_name":"is_active","value":["YES"],"operator":"in"}]}')

Purpose: This function been created to get plan l3 aps details list for 2-1 screen 
 
Calling Statement:
SELECT assort.plan_budget_master_grouping_list('{"filters":[{"attribute_name":"plan_code","value":[2361],"operator":"in"},{"attribute_name":"channel","value":["US","ECOMM","CA"],"prefix":"levels","operator":"in"},{"attribute_name":"is_active","value":["YES"],"operator":"in"}]}');

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
    	_where:=(select * from assort.prepare_where_clause_from_json_filters(_filter_data) );
    
		_query_combine := 'select plan_code ,jsonb_build_object(''l0_name'', l0_name,''l1_name'',l1_name,''l2_name'',l2_name,''sub_channel'',sub_channel,''channel'',channel,''fiscal_year'',fiscal_year,''fiscal_month'',fiscal_month) as levels,
							jsonb_build_object(''qty_ly'',qty_ly,''qty_ty'',qty_ty,''budget_ly'',budget_ly,''budget_ty'',budget_ty,''retail_budget_ly'',retail_budget_ly,''retail_budget_ty'',retail_budget_ty,''total_l2_budget_ty'',total_l2_budget_ty) attribute_value 
							from (
							select plan_code,l0_name,l1_name,l2_name,fiscal_year,fiscal_month, (array_agg(sub_channel)) sub_channel,(array_agg(channel)) channel,sum(qty_ly) qty_ly,sum(qty_ty) qty_ty,sum(budget_ly) budget_ly,sum(budget_ty) budget_ty,sum(retail_budget_ly) retail_budget_ly,
							sum(retail_budget_ty) retail_budget_ty,sum(total_l2_budget_ty) total_l2_budget_ty from (
							SELECT plan_code,(levels->>''l0_name'')::text l0_name, (levels->>''l1_name'')::text l1_name, (levels->>''l2_name'')::text l2_name,(levels->>''channel'')::text channel ,(levels->>''sub_channel'')::text sub_channel,
							(levels->>''fiscal_year'')::text fiscal_year,(levels->>''fiscal_month'')::text fiscal_month,
							(attribute_value->>''qty_ly'')::float qty_ly, (attribute_value->>''qty_ly'')::float  qty_ty, (attribute_value->>''budget_ly'')::float  budget_ly,
							(attribute_value->>''budget_ty'')::float  budget_ty, (attribute_value->>''retail_budget_ly'')::float retail_budget_ly, (attribute_value->>''retail_budget_ty'')::float  retail_budget_ty,
							(attribute_value->>''total_l2_budget_ty'')::float total_l2_budget_ty
							FROM assort.plan_budget_master
							' || _where ||'
							) as plan_bud 
							group by 1,2,3,4,5,6
							) final_temp';
		raise notice '%', _query_combine;
		RETURN QUERY execute _query_combine;
 	end
$function$
;
