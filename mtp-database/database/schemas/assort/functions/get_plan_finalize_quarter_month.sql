--liquibase formatted sql
--changeset hemant.kumar@impactanalytics.co:assort.get_plan_finalize_quarter_month liquibase:get_finalize_assort_master_choice runOnChange:true stripComments:false splitStatements:false context:MTP-29907 labels:liquibase_project_start
--comment: initial changeset for get_plan_finalize_quarter_month
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort.get_plan_finalize_quarter_month(input integer);
CREATE OR REPLACE FUNCTION assort.get_plan_finalize_quarter_month(input integer)
 RETURNS TABLE(quarter text, fm integer[])
 LANGUAGE plpgsql
AS $function$
							declare
								_query_combine text;
								begin
									_query_combine := 'SELECT distinct CONCAT(''qtr'','''',levels->>''quarter'') as quarter,array_agg(distinct (levels->>''fm'')::int) as fm  
														FROM assort.plan_finalize_assort_master 
														where plan_code  = ' || $1 ||'
														group by levels->>''quarter'' 
														order by  quarter ';
									raise notice '%', _query_combine;
									RETURN QUERY execute _query_combine;
							 	end
$function$
;