--liquibase formatted sql
--changeset liquibase:plan_cluster_list_update runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: cluster name key for plan_cluster_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS cluster_smart.plan_cluster_list(input refcursor, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION cluster_smart.plan_cluster_list(input refcursor, jsonb, jsonb, jsonb)
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
		_query_pm := 'SELECT * FROM "cluster_smart".cluster_plan_master' || ("cluster_smart".form_main_table_filters('cluster_plan_code', $2));
 		_query_pa := "cluster_smart".form_attribute_table_filters('cluster_plan_attributes', 'cluster_plan_code', $3);
		_query_table_filters := "global".form_table_query($4);
		_query_combine := 'select
				*
			from
				(
				select
						main.cluster_plan_code,
						main.name,
						main.description,
						main.selling_period_sdate as selling_period_sdate,
						main.selling_period_edate as selling_period_edate,
						main.compare_year as compare_year,
						main.status,
						main.steps as plan_step,
						main.created_at,
						main.updated_at,
						main.created_by,
						main.channel as channel,
						attributes.*,
						ta.attribute_value as cluster_name_order
					from
						(' || _query_pm || ') main
					join (' || _query_pa || ') attributes on
						main.cluster_plan_code = attributes.cluster_plan_code
						cross join global.tenant_attribute_master as ta
						where ta.name = ''client_specific_cluster_name_level''
				) X ' || _query_table_filters;
		raise notice '%', _query_combine;
		--RETURN QUERY execute _query_combine;
		OPEN $1 FOR execute _query_combine;
		RETURN $1;
 	end
$function$
;
