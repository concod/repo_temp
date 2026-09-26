--liquibase formatted sql
--changeset pradiksha.k@impactanalytics.co:assort_smart.plan_assort_list  runOnChange:true stripComments:false splitStatements:false context:MTP-23511 labels:liquibase_project_start
--comment: initial changeset for plan_assort_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort_smart.plan_assort_list(input refcursor, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION assort_smart.plan_assort_list(input refcursor, jsonb, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
	_query_pm text := '';
	_query_pa text := '';
	--_pa_input jsonb;
	_query_table_filters text := '';
	_query_combine text;
	begin
		select jsonb_object_agg(key, value) into $2 from (select * from jsonb_each_text($2) where key != 'is_deleted' union select 'is_deleted', '[{"type":"custom","operator":"=","values":"false"}]') x;
		_query_pm := 'SELECT * FROM "assort_smart".plan_master' || ("assort_smart".form_main_table_filters('plan_code', $2));
 		_query_pa := "assort_smart".form_attribute_table_filters('plan_attributes', 'plan_code', $3);
		_query_table_filters := "global".form_table_query($4);
		_query_combine := 'select
				*
			from
				(
				select
						main.plan_code,
						main.name,
						main.description,
						main.selling_period_sdate as selling_period_sdate,
						main.selling_period_edate as selling_period_edate,
						main.compare_year as compare_year,
						main.status,
						main.steps as plan_step,
						main.plan_sub_step,
						main.created_at,
						main.updated_at,
						main.created_by,
						main.channel as channel,
						main.hierarchy_level,
						attributes.*
					from
						(' || _query_pm || ') main
					join (' || _query_pa || ') attributes on
						main.plan_code = attributes.plan_code
				) X ' || _query_table_filters;
		raise notice '%', _query_combine;
		--RETURN QUERY execute _query_combine;
		OPEN $1 FOR execute _query_combine;
		RETURN $1;
 	end
$function$
;
