--liquibase formatted sql
--changeset liquibase:get_fiscal_year_month runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_fiscal_year_month
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort_smart.get_fiscal_year_month(input text);
CREATE OR REPLACE FUNCTION assort_smart.get_fiscal_year_month(input text)
 RETURNS TABLE(fiscal_year integer, fiscal_month integer)
 LANGUAGE plpgsql
AS $function$
/*
Function/Procedure name: assort.get_fiscal_year_month
Created by: Mohammed Ayaz
Created at: 7-Nov-2022
Update at: 7-Nov-2022
No of input parameter: 1
Parameter Description : $1, date str

Purpose: This function been created to get fiscal_year & fiscal  for calendate for plan-review-screen

returns:
 fiscal_year, fiscal_month

Calling Statement:
SELECT assort_smart.get_fiscal_year_month("2023-07-30");

Mohammed Ayaz:
*/
declare
	_query_combine text;
	begin
		_query_combine := 'select fy::int4 as "Fiscal_Year",
							fm::int4 as "Fiscal_Month"
							from assort_smart.fiscal_calendar where calendar_date  = ''' || $1 ||'''';
		raise notice '%', _query_combine;
		RETURN QUERY execute _query_combine;
 	end
$function$
;