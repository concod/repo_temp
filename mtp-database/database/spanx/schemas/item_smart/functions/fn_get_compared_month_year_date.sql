--liquibase formatted sql
--changeset hemant.kumar@impactanalytics.co:fn_get_compared_month_year_date runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:item_smart_initial_commit
--comment: initial changeset for fn_get_compared_month_year_date
--rollback: SELECT 1
DROP FUNCTION IF EXISTS item_smart.fn_get_compared_month_year_date(sdate date, edate date);
CREATE OR REPLACE FUNCTION item_smart.fn_get_compared_month_year_date(sdate date, edate date)
 RETURNS TABLE(fiscal_month integer, fiscal_month_name_abb text, fiscal_year integer, fiscal_month_begin_date date, fiscal_quarter_name text)
 LANGUAGE plpgsql
AS $function$
							declare
								_query_combine text;
								begin
									_query_combine := 'select distinct fiscal_month::int ,fiscal_month_name_abb::text ,fiscal_year::int, fiscal_month_begin_date::date ,fiscal_quarter_name_abb::text fiscal_quarter_name 
														FROM "global".fiscal_date_mapping 
														where calendar_date between ''' || $1 ||' '' and ''' || $2 ||' ''
														order by fiscal_year,fiscal_month,fiscal_month_begin_date ';
									raise notice '%', _query_combine;
									RETURN QUERY execute _query_combine;
							 	end
$function$
;
