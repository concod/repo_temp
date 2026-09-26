--liquibase formatted sql
--changeset rishabh.kumar@impactanalytics.co:cluster_smart.plan_filter_cluster_name_update_0 runOnChange:true stripComments:false splitStatements:false context:MTP-59526 labels:liquibase_project_start
--comment: Update cluster count name
--rollback: SELECT 1
DROP FUNCTION IF EXISTS cluster_smart.plan_filter(input refcursor, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION cluster_smart.plan_filter(input refcursor, jsonb, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
	_query_pm text := '';
	_query_pa text := '';
	_query_table_filters text := '';
	_query_combine text;
	begin
		_query_pm := 'SELECT * FROM "cluster_smart".cluster_plan_master' || ("cluster_smart".form_main_table_filters('cluster_plan_master', $2));
 		_query_pa := "cluster_smart".form_attribute_table_filters('cluster_plan_attributes', 'cluster_plan_code', $3);
		_query_table_filters := "global".form_table_query($4);
		_query_combine := ' SELECT * FROM (
				select plan_list.*,final.* from (
				select plan.*,  um.name as created_by from (
				select
						--main.cluster_plan_code,
						trim(main.name) as name,
						main.description,
						main.selling_period_sdate as selling_period_sdate,
						main.selling_period_edate as selling_period_edate,
						main.status,
						main.channel as channel,
						main.steps as plan_step,
						main.created_at,
						main.updated_at,
						main.created_by as created_by_code,
						attributes.*
					from
						(' || _query_pm || ') main
					JOIN (' || _query_pa || ') attributes ON
						main.cluster_plan_code = attributes.cluster_plan_code ) plan
					JOIN
						"global".user_master um
					ON plan.created_by_code = um.user_code
) plan_list	
					LEFT JOIN 
				    (
									select distinct  count(cluster_plan_code)  as "clusters"
								,
								cluster_plan_code as final_cluster_plan_code
								FROM cluster_smart.plan_cluster_final 
								WHERE cluster_plan_code in (select
									   cluster_plan_code
								from  cluster_smart.cluster_plan_master
								where steps = 1.3) 
								group by cluster_plan_code 			     
				    ) final on plan_list.cluster_plan_code=final.final_cluster_plan_code
				) X ORDER BY created_at desc nulls last 
				';
		raise notice '%','SELECT * FROM (' || _query_combine || ') X ' || _query_table_filters;
		OPEN $1 FOR  execute 'SELECT * FROM (' || _query_combine || ') X ' || _query_table_filters;
		RETURN $1;
 	end
$function$
;