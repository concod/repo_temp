--liquibase formatted sql
--changeset rahul.chodvadiya@impactanalytics.co:fn_get_compared_week_date runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:item_smart_monthly_view_updates
--comment: monthly view update
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.fn_get_compared_week_date(date);

CREATE OR REPLACE FUNCTION item_smart.fn_get_compared_week_date(input date)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
declare
	_query_combine text;
	vl_result_set int; 
	begin
		_query_combine := 'SELECT distinct fiscal_year_week FROM "global".fiscal_date_mapping where calendar_date  = ''' || $1 ||' ''
';
		raise notice '%', _query_combine;
		execute _query_combine into vl_result_set;
		return vl_result_set;
 	end
$function$
;
