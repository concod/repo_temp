--liquibase formatted sql
--changeset liquibase:get_cluster_and_level_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_cluster_and_level_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort_smart.get_cluster_and_level_list(input jsonb);
CREATE OR REPLACE FUNCTION assort_smart.get_cluster_and_level_list(input jsonb)
 RETURNS TABLE(cluster_list character varying[], l0_name_list character varying[], l1_name_list character varying[], l2_name_list character varying[], l3_name_list character varying[])
 LANGUAGE plpgsql
AS $function$
 
 	/*
 Function/Procedure name: assort_smart.get_cluster_and_level_list
 Created by: Hemant Kumar Singh
 Created at: 10-Mar-2022
 Updated at: 12-Apr-2022
 No of input parameter: 1
 Parameter Description : $1 = jsonb
 
 Purpose: This function been created to getting cluster and level list 
 
 Calling Statement:
 
 SELECT assort_smart.get_cluster_and_level_list('{"filters":[{"attribute_name":"plan_code","value":[164],"operator":"in"},{"attribute_name":"l0_name","value":["Footwear"],"prefix":"levels","operator":"in"},{"attribute_name":"l1_name","value":["MNS"],"prefix":"levels","operator":"in"},{"attribute_name":"l2_name","value":["Basketball"],"prefix":"levels","operator":"in"}]}
 ');
 
 
 Hemant Kumar SIngh:getting cluster and level list 
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
      
  		_query_combine := 'SELECT  
 							    array_agg(distinct levels->>''cluster_code'')::varchar[] cluster_list, 
 							    array_agg(distinct levels->>''l0_name'')::varchar[]  l0_name_list,
 							    array_agg(distinct levels->>''l1_name'')::varchar[]  l1_name_list,
 							    array_agg(distinct levels->>''l2_name'')::varchar[]  l2_name_list,
 							    array_agg(distinct levels->>''l3_name'')::varchar[]  l3_name_list
 							    FROM assort_smart.plan_wedge_opt_master
 							 	' || _where ||'
 								group  by plan_code	
  							';
 		raise notice '%', _query_combine;
 		RETURN QUERY execute _query_combine;
  	end
 $function$
;
