--liquibase formatted sql
--changeset liquibase:get_fiscal_year_month runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_fiscal_year_month
--rollback: SELECT 1
DROP FUNCTION IF EXISTS "global".get_fiscal_year_month(input text);
CREATE OR REPLACE FUNCTION "global".get_fiscal_year_month(input text)
 RETURNS TABLE(fiscal_year integer, fiscal_month integer)
 LANGUAGE plpgsql
AS $function$
 /*
 Function/Procedure name: "global".get_fiscal_year_month
 Created by: Hemant Kumar Singh
 Created at: 19-Apr-2023
 Update at: 19-Apr-2023
 No of input parameter: 1
 Parameter Description : $1, date str
 
 Purpose: This function been created to get fiscal_year & fiscal  for calendate 
 
 returns:
  fiscal_year, fiscal_month
 
 Calling Statement:
 SELECT "global".get_fiscal_year_month('2023-07-30');
 
 Hemant Kumar Singh:
 */
 declare
 	_query_combine text;
 	begin
 		_query_combine := 'select fiscal_year::int4 as "Fiscal_Year",
 							fiscal_month::int4 as "Fiscal_Month"
 							from "global".fiscal_date_mapping where calendar_date  = ''' || $1 ||'''';
 		raise notice '%', _query_combine;
 		RETURN QUERY execute _query_combine;
  	end
 $function$
;
