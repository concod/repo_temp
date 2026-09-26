--liquibase formatted sql
--changeset liquibase:allocation_summary_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for allocation_summary_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.allocation_summary_list(input refcursor, text);
CREATE OR REPLACE FUNCTION inventory_smart.allocation_summary_list(input refcursor, text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
/*
 * Function/Procedure name: inventory_smart.allocation_summary_list
 * Created by: Kailash Yadav
 * Created at: 19-Jul-2022
 * No of input parameter: 1
 * Parameter Description : 
 * 						   $1 = refcursor name
 * 						   $2 = Allocation code	
 * 
 * Purpose: This function been created to get the list of product rules for given product filter
 * Calling Statement:
		 select * from inventory_smart.allocation_summary_list('abc','Out_118_1646284400')
 *
 * if any modification done in same function/procedure please record the changes in below format
 *
 * Updated_by       Updated_on      Purpose
 * ----------       -----------     --------
 *
 */
	declare
		_query_combine text;
	begin
		
		_query_combine:= 'select count(distinct style||''-''||color), min (selected_store_count) as allocated_stores , 
							count(distinct store ) allocated_stores_per_style_color,  sum ( carfg.allocated_total ) Allocated_qty,
							count(distinct dc_codes) dc_codes, count(distinct carfg.new_size), 100 as "allocation%"   
							from inventory_smart.create_allocation_result_flat_gurobi carfg 
							where allocation_code ='''||$2||'''';
					
		 raise notice '%',_query_combine;			

 		OPEN $1 FOR execute _query_combine;
		RETURN $1;

	
	end
$function$
;
