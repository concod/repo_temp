--liquibase formatted sql
--changeset rishabh.kumar@impactanalytics.co:add_status_column runOnChange:true stripComments:false splitStatements:false context:add_status_column labels:liquibase_project_start
--comment: Add status column
DROP FUNCTION IF EXISTS assort_smart.plan_filter(input refcursor, jsonb, jsonb, jsonb);

CREATE OR REPLACE FUNCTION assort_smart.plan_filter(input refcursor, jsonb, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
/*
Function/Procedure name: assort_smart.plan_cluster_opt_attribute_update
Created by: Hemant Kumar Singh
Created at: 22-Aug-2023
Update at: 22-Aug-2023
No of input parameter: 4
Parameter Description : jsonb
Purpose: to update plan_filter

Calling Statement:
SELECT assort_smart.plan_filter('query',
'{"special_classification": [{"type": "custom", "operator": "is", "values": "null"}], "is_deleted": [{"type": "custom", "operator": "=", "values": false}]}',
'{"l0_name": [], "l1_name": [], "l2_name": [], "l3_name": [], "season": [], "sub_channel": []}',
'{"search": [], "sort": [{"column": "created_at", "order": "desc"}], "range": [], "limit": null}');
_where:=(select * from assort_smart.prepare_where_clause_from_json_filters(_filter_data) );
*/
 declare
 	_query_pm text := '';
 	_query_pa text := '';
 	_query_table_filters text := '';
 	_query_combine text;
   _where text;
 	begin
	 	_where:=(select * from assort_smart.prepare_where_clause_from_json_filters($2) );
 		_query_pm := 'SELECT * FROM "assort_smart".plan_master' || _where;
 		raise notice '_query_pm= %',_query_pm;
  		_query_pa := "assort_smart".form_attribute_table_filters('plan_attributes', 'plan_code', $3);
 		_query_table_filters := "global".form_table_query($4);
 		_query_combine := '
 				select plan.*,  um.name as created_by from (
 				select
 						main.plan_code,
 						trim(main.name) as name,
 						main.description,
 						main.selling_period_sdate as selling_period_sdate,
 						main.selling_period_edate as selling_period_edate,
 						INITCAP(REPLACE(REPLACE(main.plan_sub_step, ''_'', '' ''), ''-'', '' '')) as status,
 						main.channel_id as channel_id,
						main.channel_code as channel_code,
						main.sub_channel_code as sub_channel_code,
						main.sub_channel_id as sub_channel_id,
 						main.created_at,
 						main.updated_at,
 						main.created_by as created_by_code,
                        main.status_id,
						main.hierarchy_code,
 						main.record_type as record_type,
 						main.season_name as season_name,
 						main.levels,
 						main.parent_hierarchy_combination,
						main.season_code,
						main.compare_year,
						main.steps as step_display_name,
						main.plan_sub_step as sub_step_display_name,
						main.step_id as step,
						main.sub_step_id,
						main.step_id,
						attributes.*,
						ldrm.launch_delivery_details,
						''Unapproved'' AS approval_status
 					from
 						(select main.*, channel_details.channel_code ,channel_details.sub_channel_code  from
						(' || _query_pm || ') main

						left join
						(select cd.*, scd.sub_channel_code  from assort_smart.channel_details cd
						left join assort_smart.sub_channel_details scd
						on cd.channel_id = scd.channel_id ) channel_details
						on main.channel_id = channel_details.channel_id
						)main
 					JOIN (' || _query_pa || ') attributes ON
 						main.plan_code = attributes.plan_code
					left join (
							select dd.record_id,  json_agg(json_build_object(
							''launch'', dd.launch,
							''launch_start_date'', dd.launch_start_date,
							''delivery_details'' ,dd.delivery_details)
							) launch_delivery_details
									from (
							select record_id,  launch, launch_start_date,
									 json_agg(json_build_object(
							        ''delivery'', delivery,
							''delivery_start_date'', delivery_start_date,
							''delivery_end_date'', delivery_end_date
							    )) delivery_details
							    from  assort_smart.launch_delivery_records_mapping ldrm
							group by record_id, launch, launch_start_date
							) dd
							group by dd.record_id
						) ldrm
				   	on main.plan_code = ldrm.record_id

					) plan
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
