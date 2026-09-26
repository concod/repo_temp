--liquibase formatted sql
--changeset liquibase:get_week_month_quarter_dates_ids runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_week_month_quarter_dates_ids
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.get_week_month_quarter_dates_ids(input text, integer, integer);
CREATE OR REPLACE FUNCTION global.get_week_month_quarter_dates_ids(input text, integer, integer)
 RETURNS TABLE(fiscal_id integer)
 LANGUAGE plpgsql
AS $function$
/*  
 * Function/Procedure name: global.get_week_month_quarter_dates_ids
 * Created by: Kailash Yadav
 * Created at: 07-Sep-2022
 * No of input parameter: 3
 * Parameter Description : $1 = Text (static values : W/M/Q/Y
 *                         $2 = from weekid  
 * 						   $3 = end weekid 
 * Purpose: This function will return the corresponding fiscal ids 
 * Calling Statement:   
 	  select * from global.get_week_month_quarter_dates_ids ('Y',202201,202206 )
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
		if $1 = 'W' then
		_query_combine := 
			'select distinct fw_id fiscal_id
			from
			 global.fc_fy_fw_level x
			where
			 x.fw_id  >= '||$2||'
			 and x.fw_id <= '||$3||';'; 
			
		elseif  $1 = 'Y' then
		_query_combine := 
			' select
				distinct fy fiscal_id
			from
				global.fc_fy_fw_level x
			where
				 x.fw_id  >= '||$2||'
			 and x.fw_id <= '||$3||';'; 
			
		elseif $1 = 'Q' then
			_query_combine := 
			'  select distinct fq_id  fiscal_id
				from
				global.fc_fy_fw_level x
			where
				 x.fw_id  >= '||$2||'
			 and x.fw_id <= '||$3||';'; 
		elseif $1 = 'M' then
			_query_combine := 
			'  select distinct 
	 				fm_id fiscal_id
			from
				global.fc_fy_fw_level x
			where
				 x.fw_id  >= '||$2||'
			 and x.fw_id <= '||$3||';'; 
		end if;
		raise notice '%',_query_combine;
		return query execute _query_combine;
 	end
$function$
;