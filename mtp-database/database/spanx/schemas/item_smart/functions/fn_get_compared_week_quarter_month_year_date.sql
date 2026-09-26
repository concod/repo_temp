--liquibase formatted sql
--changeset hemant.kumar@impactanalytics.co:fn_get_compared_week_quarter_month_year_date_chg1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:item_smart_initial_commit
--comment: initial changeset for fn_get_compared_week_quarter_month_year_date
--rollback: SELECT 1
DROP FUNCTION IF EXISTS item_smart.fn_get_compared_week_quarter_month_year_date(sdate date, edate date);
CREATE OR REPLACE FUNCTION item_smart.fn_get_compared_week_quarter_month_year_date(sdate date, edate date)
 RETURNS TABLE(fiscal_year integer, fiscal_quarter_name text, fiscal_month_name text, fiscal_week integer[])
 LANGUAGE plpgsql
AS $function$
							declare
								_query_combine text;
								begin
									_query_combine := 'select distinct fiscal_year::int,fiscal_quarter_name_abb::text fiscal_quarter_name ,fiscal_month_name_abb::text fiscal_month_name,array_agg(distinct fiscal_week::int) fiscal_week   
														FROM "global".fiscal_date_mapping 
														where calendar_date between ''' || $1 ||' '' and ''' || $2 ||' ''
														group by 1,2,3
														order by 1,2 ';
									raise notice '%', _query_combine;
									RETURN QUERY execute _query_combine;
							 	end
$function$
;