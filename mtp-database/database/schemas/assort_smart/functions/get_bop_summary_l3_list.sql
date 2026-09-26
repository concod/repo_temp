--liquibase formatted sql
--changeset liquibase:get_bop_summary_l3_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_bop_summary_l3_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort_smart.get_bop_summary_l3_list(input jsonb);
CREATE OR REPLACE FUNCTION assort_smart.get_bop_summary_l3_list(input jsonb)
 RETURNS TABLE(plan_code integer, l0_name text, l1_name text, l2_name text, l3_name text, channel text, bop_receipt double precision, bop_qty double precision, bop_choice_count integer)
 LANGUAGE plpgsql
AS $function$
 	/*
 Function/Procedure name: assort_smart.get_bop_summary_l3_list
 Created by: Hemant Kumar Singh
 Created at: 11-Apr-2022
 No of input parameter: 1
 Parameter Description : $1 = Plan code 
 
 Purpose: This function been created to getting bop summary list for l3 level  
 
 Calling Statement:
 
 SELECT assort_smart.get_bop_summary_l3_list(896);
 
 
 Hemant Kumar SIngh:getting bop summary list 
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
     
 		_query_combine := 'select 
 								plan_code,
 								l0_name,
 							    l1_name,
 							    l2_name,
 							    l3_name,
								channel,
 							    (((100-st))* bop_qty*aic )/100 as bop_receipt,
 							    bop_qty,
 							    bop_choice_count
 							from
 							    (
 							    select
 							        plan_code,
 							        levels->>''l0_name'' l0_name,
 							levels->>''l1_name'' l1_name,
 							levels->>''l2_name'' l2_name,
 							levels->>''l3_name'' l3_name,
							levels->>''channel'' channel,
 							sum(COALESCE((attribute_value->>''total_qty'')::float8, 0) *(attribute_value->>''st'')::float8) / CASE when sum(COALESCE((attribute_value->>''total_qty'')::float8, 0)) = 0 then 1 ELSE sum(COALESCE((attribute_value->>''total_qty'')::float8, 0)) END st,
 							sum(COALESCE((attribute_value->>''total_qty'')::float8, 0) *(attribute_value->>''aur'')::float8)/CASE when sum(COALESCE((attribute_value->>''total_qty'')::float8, 0)) = 0 then 1 ELSE sum(COALESCE((attribute_value->>''total_qty'')::float8, 0)) END aic,
 							sum(COALESCE((attribute_value->>''total_qty'')::float8, 0)) qty,
 							sum(COALESCE((attribute_value->>''cluster_qty'')::float8, 0) * (attribute_value->>''cluster_store_count'')::float8 *(100-(attribute_value->>''st'')::float8))/100 bop_qty,
 							COUNT(DISTINCT attribute_value->>''choice_name'')::int4 bop_choice_count
 							from
 							    assort_smart.plan_wedge_opt_master
 							 ' || _where ||'
 							group by 1,2,3,4,5,6
 							    ) as finalTable	
 							';
 		raise notice '%', _query_combine;
 		RETURN QUERY execute _query_combine;
  	end
 $function$
;
