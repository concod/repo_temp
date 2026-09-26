--liquibase formatted sql
--changeset hemant.kumar@impactanalytics.co:assort_smart.get_actualized_style_colors liquibase:get_finalize_po_sheet_details runOnChange:true stripComments:false splitStatements:false context:MTP-21817 labels:liquibase_project_start
--comment: initial changeset for get_actualized_style_colors
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort_smart.get_actualized_style_colors(input jsonb);
CREATE OR REPLACE FUNCTION assort_smart.get_actualized_style_colors(input jsonb)
 RETURNS TABLE(used_choice BIGINT, total_choice_count BIGINT)
 LANGUAGE plpgsql
AS $function$
 	/*
 Function/Procedure name: assort_smart.get_actualized_style_colors
 Created by: Hemant Kumar Singh
 Created at: 24-Jul-2023
 No of input parameter: 1
 Parameter Description : $1 =  jsonb
 
 Purpose: This function been created to getting   
 
 Calling Statement:
 
 SELECT assort_smart.get_actualized_style_colors('{"filters":[{"attribute_name":"plan_code","value":[10],"operator":"in"}]}');
 
 
 Hemant Kumar Singh:getting actualized style colors
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
     
 		_query_combine := 'SELECT * FROM 
							  (select  count((attribute_value->>''choice_name'')) used_choice
							   from assort_smart.plan_wedge_opt_master
							   ' || _where ||'
							   and attribute_value->>''article_number'' !=''''
							   and attribute_value->>''color_name'' !='''') total_choice_used, 
							  (select count( distinct (attribute_value->>''choice_name'' ) ) total_choice_count
							   from assort_smart.plan_wedge_opt_master
							   ' || _where ||') total_choice_count	
 							';
 		raise notice '%', _query_combine;
 		RETURN QUERY execute _query_combine;
  	end
 $function$
;
;