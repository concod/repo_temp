--liquibase formatted sql
--changeset liquibase:get_generic_schema_mapping_mul_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_generic_schema_mapping_mul_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort.get_generic_schema_mapping_mul_list(input text[]);
CREATE OR REPLACE FUNCTION assort.get_generic_schema_mapping_mul_list(input text[])
 RETURNS TABLE(dy_column_name jsonb)
 LANGUAGE plpgsql
AS $function$
	/*
Function/Procedure name: assort.get_generic_schema_mapping_mul_list
Created by: Hemant Kumar Singh
Created at: 06-Oct-2022
No of input parameter: 1
Parameter Description : $1 =  list 
​
Purpose: This function been created to getting scren  
​
Calling Statement:
​
SELECT assort.get_generic_schema_mapping_mul_list('{"l3_name","l2_name","l1_name","l0_name"}');
​
​
Hemant Kumar SIngh:getting season and drop values  from  assort.get_generic_schema_mapping_mul_list
*/

 declare
   _query_combine text;
	_level  text:=' ';
	_level_name text:='';
	_cntr integer:=0;
    begin
     
	    if array_length($1::text[],1) =1 then 
	    	raise notice '%',_level;	
	    	 _level := ''''||$1[1]||'''';
	    	
	    else
	    for _level_name in select unnest($1::text[])
	       loop
		       	_level_name := ''''||_level_name||'''';
		       _cntr:= _cntr+1;
		       if _cntr =1 then 
		       	 _level:= concat (_level, _level_name );
		       	else 
	                _level:= concat (_level,','||_level_name );
	           end if;    
	            
	       end loop ;
	     end if; 
		_query_combine := 'SELECT jsonb_object_agg(source_column_name,generic_column_name) dy_column_name
								FROM "global".product_generic_schema_mapping
							 	where generic_column_name in  (' || _level || ')
					';
		raise notice '%', _query_combine;
		RETURN QUERY execute _query_combine;
    end
    $function$
;
