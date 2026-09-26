--liquibase formatted sql
--changeset liquibase:get_fiscal_year_month runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_fiscal_year_month
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort.get_fiscal_year_month(input text);
CREATE OR REPLACE FUNCTION assort.get_fiscal_year_month(input text)
 RETURNS TABLE(fiscal_year integer, fiscal_month integer)
 LANGUAGE plpgsql
AS $function$
declare
	_query_combine text;
	begin
		_query_combine := 'select fy::int4 as "Fiscal_Year",
							fm::int4 as "Fiscal_Month"
							from assort.fiscal_calendar where calendar_date  = ''' || $1 ||'''';
		raise notice '%', _query_combine;
		RETURN QUERY execute _query_combine;
 	end
$function$

;