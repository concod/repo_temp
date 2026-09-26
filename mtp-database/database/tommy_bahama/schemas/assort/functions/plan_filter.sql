--liquibase formatted sql
--changeset pradiksha.k@impactanalytics.co:plan_filter runOnChange:true stripComments:false splitStatements:false context:MTP-40949_plan_sub_step added  labels:liquibase_project_start
--comment: MTP-40949_plan_sub_step added
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort.plan_filter(input refcursor, jsonb, jsonb, jsonb);
/*

	List plan_filter
	Author: Ashish Gupta
	Update:
		1) Pradeep Nayak , 03-03-2022 - Added user name in return data from created by user code.
		2) Kailash Yadav, 02-May-2022 - Change form_main_table_filters 1 parameter.
		3) Pradeep Nayak 18 May 2022 - Channels changed to channel for UAM validation
*/
CREATE OR REPLACE FUNCTION assort.plan_filter(input refcursor, jsonb, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
	_query_pm text := '';
	_query_pa text := '';
	_query_table_filters text := '';
	_query_combine text;
	begin
		_query_pm := 'SELECT * FROM "assort".plan_master' || ("assort".form_main_table_filters('plan_master', $2));
 		_query_pa := "assort".form_attribute_table_filters('plan_attributes', 'plan_code', $3);
		_query_table_filters := "global".form_table_query($4);
		_query_combine := '
				select plan.*,  um.name as created_by from (
				select
						main.plan_code,
						trim(main.name) as name,
						main.description,
						main.selling_period_sdate as selling_period_sdate,
						main.selling_period_edate as selling_period_edate,
						main.status,
						main.channel as channel,
						main.steps as plan_step,
						main.plan_sub_step,
						main.created_at,
						main.updated_at,
						main.created_by as created_by_code,
						attributes.*
					from
						(' || _query_pm || ') main
					JOIN (' || _query_pa || ') attributes ON
						main.plan_code = attributes.plan_code ) plan
					JOIN
						"global".user_master um
					ON plan.created_by_code = um.user_code
				';
		raise notice '%','SELECT * FROM (' || _query_combine || ') X ' || _query_table_filters;
		OPEN $1 FOR  execute 'SELECT * FROM (' || _query_combine || ') X ' || _query_table_filters;
		RETURN $1;
 	end
$function$
;
