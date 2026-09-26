--liquibase formatted sql
--changeset kailash.yadav@impactanalytics.co:get_fyid runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:get_fyid
--comment: Needed functions for ada_visual
--rollback: SELECT 1

DROP FUNCTION IF EXISTS global.get_fyid(input text, integer, integer);
CREATE OR REPLACE FUNCTION global.get_fyid(input text, integer, integer)
 RETURNS TABLE(fiscal_year_week integer)
 LANGUAGE plpgsql
AS $function$
/*  
 * Function/Procedure name: global.get_fyid
 * Created by: Kailash Yadav
 * Created at:27-Sep-2023
 * No of input parameter: 3
 * Parameter Description : $1 = Text (static values : W/M/Q/Y
 *                         $2 = Based on $1 , if  $1= M then month_id and $1= Q then Qauter_id 
 * 						   $3 = start_fiscal_year_week
 * Purpose: This function will return the corresponding fiscal ids 
 * Calling Statement:   
 	  select * from global.get_fyid ('M',202409,202435 )
 * 
 * if any modification done in same function/procedure please record the changes in below format
 * 
 * Updated_by       Updated_on      Purpose
 * ----------       -----------     --------
 *   
 */
declare 
	_query_combine text:='';
begin
		
		
			
		if  $1 = 'M' then
		_query_combine := 
			' select distinct fiscal_year_week  from global.fiscal_date_mapping fdm 
				where fiscal_year_month ='||$2||'
				and fiscal_year_week >='||$3||';'; 
				
			
		elseif $1 = 'Q' then
			_query_combine := 
			' select distinct fiscal_year_week  from global.fiscal_date_mapping fdm 
				where fiscal_year_quarter  ='||$2||'
				and fiscal_year_week >='||$3||';'; 
		elseif $1 = 'Y' then
				_query_combine := 
			' select distinct fiscal_year_week  from global.fiscal_date_mapping fdm 
				where fiscal_year  ='||$2||'
				and fiscal_year_week >='||$3||';';  
		end if;
		raise notice '%',_query_combine;
		return query execute _query_combine;
 	end
$function$
;
