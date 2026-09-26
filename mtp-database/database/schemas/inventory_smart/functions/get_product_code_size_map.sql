--liquibase formatted sql
--changeset liquibase:get_product_code_size_map runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_product_code_size_map
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_product_code_size_map(input refcursor, text);
CREATE OR REPLACE FUNCTION inventory_smart.get_product_code_size_map(input refcursor, text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
/*
 * Function/Procedure name: inventory_smart.get_product_code_size_map
 * Created by: Renugopal
 * Created at: 19-Dec-2022
 * No of input parameter: 1
 * Parameter Description : 
 * 						   $1 = refcursor name
 * 						   $2 = LIST OF comma separated article in str format
 * 
 * Purpose: This function is created to return product codes of an article in relation to size
 * Calling Statement:
		 select * from inventory_smart.get_product_code_size_map('abc','article')
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
		

	
		_query_combine:= '
			SELECT JSON_OBJECT_AGG(article, size_product_map) as article_map
			FROM
				(SELECT 
					article, 
					JSON_OBJECT_AGG(size, product_code) as size_product_map 
				FROM global.product_attributes_filter paf 
				WHERE article in ('''||$2||''') 
				GROUP BY 1
				) a
			'; 

		
		
		
		 raise notice '%',_query_combine;			

 		OPEN $1 FOR execute _query_combine;
		RETURN $1;	
	end
$function$
;
