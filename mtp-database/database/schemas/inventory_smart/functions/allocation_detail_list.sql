--liquibase formatted sql
--changeset liquibase:allocation_detail_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for allocation_detail_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.allocation_detail_list(input refcursor, text);
CREATE OR REPLACE FUNCTION inventory_smart.allocation_detail_list(input refcursor, text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
/*
 * Function/Procedure name: inventory_smart.allocation_detail_list
 * Created by: Kailash Yadav
 * Created at: 19-Jul-2022
 * No of input parameter: 1
 * Parameter Description : 
 * 						   $1 = refcursor name
 * 						   $2 = Allocation code	
 * 
 * Purpose: This function been created to get the list of product rules for given product filter
 * Calling Statement:
		 select * from inventory_smart.allocation_detail_list('abc','Out_118_1646284400')
 *
 * if any modification done in same function/procedure please record the changes in below format
 *
 * Updated_by       Updated_on      Purpose
 * ----------       -----------     --------
 *
 */
	declare
		_query_combine text;
		_size varchar;
		_allocated_cnt varchar;
		_column text[];	
		_column_per text [];
		_sizes text;
		_sizes_per text;
	begin
		
		for _size,_allocated_cnt in 
			select  retail_size_cd::text retail_size_cd ,sum(allocated_total)::text allocated_total
				from inventory_smart.create_allocation_result_flat_gurobi carfg 
				where allocation_code = $2::text
				group by retail_size_cd ,allocation_code 
			loop 
					
				_column := array_append(_column,_allocated_cnt||' as "'||_size ||'"'   );
				_column_per := array_append(_column_per,'(('|| _allocated_cnt||'/sum ( carfg.allocated_total ))*100) as "'||_size ||'%"'   );
			
			--,round(( (1/sum ( carfg.allocated_total ))*100 ),2)  as "12%"
			
				--_column := array_append(_column, ' as "'||_size);
					
		end loop;			
				
		--raise notice '_column%',_column;
		--raise notice '_column_per%',_column_per;
		
			
			_sizes 	   := array_to_string (_column,',','');
			_sizes_per := array_to_string (_column_per,',','');
		
		--raise notice '_sizes%',_sizes;	
	
		_query_combine:= 'select count(distinct style||''-''||color), min (selected_store_count) as allocated_stores , 
							count(distinct store ) allocated_stores_per_style_color,  
							sum ( carfg.allocated_total ) Allocated_qty, '||_sizes  ||' , '||_sizes_per ||' 
							from inventory_smart.create_allocation_result_flat_gurobi carfg 
							where allocation_code ='''||$2||''''; 
		
		
		
		
		 raise notice '%',_query_combine;			

 		OPEN $1 FOR execute _query_combine;
		RETURN $1;	
	end
$function$
;
