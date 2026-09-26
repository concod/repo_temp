--liquibase formatted sql
--changeset liquibase:get_actualized_style_colors runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_actualized_style_colors
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort.get_actualized_style_colors(input integer);
CREATE OR REPLACE FUNCTION assort.get_actualized_style_colors(input integer)
 RETURNS TABLE(actual_style_color_count bigint, total_style_color_count bigint)
 LANGUAGE plpgsql
AS $function$
 	/*
 Function/Procedure name: assort.get_actualized_style_colors
 Created by: Hemant Kumar Singh
 Created at: 28-Sep-2023
 No of input parameter: 1
 Parameter Description : $1 = integer
 
 Purpose: This function been created to getting   
 
 Calling Statement:
 
 SELECT assort.get_actualized_style_colors(plan_code);
 
 
 Hemant Kumar Singh:getting actualized style colors
 */
 declare
 	_query_combine text;
 	begin     
 		_query_combine := 'SELECT * FROM 
							  (select  count(distinct((attribute_value->>''style_name''))) actual_style_color_count
							   from assort.plan_wedge_opt_master
							   where plan_code = ' || $1 ||'
							   and attribute_value->>''style_name'' !=''''
							   and attribute_value->>''color_name'' !='''') total_choice_used, 
							  (select count( distinct (attribute_value->>''choice_name'' ) ) total_style_color_count
							   from assort.plan_wedge_opt_master
							   where plan_code = ' || $1 ||') total_choice_count	
 							';
 		raise notice '%', _query_combine;
 		RETURN QUERY execute _query_combine;
  	end
 $function$
;
