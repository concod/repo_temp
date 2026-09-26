--liquibase formatted sql
--changeset hemant.kumar@impactanalytics.co:fn_get_compared_week_date runOnChange:true stripComments:false splitStatements:false context:query_updated labels:item_smart_initial_commit
--comment: initial changeset for fn_get_compared_week_date
--rollback: SELECT 1
DROP FUNCTION IF EXISTS item_smart.fn_get_compared_week_date(input date);
CREATE OR REPLACE FUNCTION item_smart.fn_get_compared_week_date(input date)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
declare
	_query_combine text;
	vl_result_set int; 
	v_gen_random_uuid text  := gen_random_uuid()::varchar;
	begin
		_query_combine := 'SELECT distinct fiscal_year_week FROM "global".fiscal_date_mapping where calendar_date  = ''' || $1 ||' ''
';
		raise notice '%', _query_combine;
		execute _query_combine into vl_result_set;
        perform global.sp_log(v_gen_random_uuid, 'item_smart.fn_get_compared_week_date', 'before returning vl_result_set', _query_combine, jsonb_build_object('input',$1));
		return vl_result_set;
 	end
$function$
;
