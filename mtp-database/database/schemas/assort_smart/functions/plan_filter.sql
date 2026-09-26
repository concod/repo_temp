--liquibase formatted sql
--changeset liquibase:assort_smart.plan_filter runOnChange:true stripComments:false splitStatements:false context:MTP-21888 labels:liquibase_project_start
--comment: initial changeset for plan_filter
--rollback: SELECT 1
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

*/
 declare
 	_query_pm text := '';
 	_query_pa text := '';
 	_query_table_filters text := '';
 	_query_combine text;
 	begin
 		_query_pm := 'SELECT * FROM "assort_smart".plan_master' || ("assort_smart".form_main_table_filters('plan_master', $2));
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
