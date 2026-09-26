--liquibase formatted sql
--changeset hemant.kumar@impactanalytics.co:cluster_smart.cluster_name_store_attr_list liquibase:cluster_name_store_attr_list runOnChange:true stripComments:false splitStatements:false context:MTP-34368 labels:liquibase_project_start
--comment: initial changeset for cluster_name_store_attr_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS cluster_smart.cluster_name_store_attr_list(input integer, text);
CREATE OR REPLACE FUNCTION cluster_smart.cluster_name_store_attr_list(input integer, text)
 RETURNS TABLE(cluster_name character varying[])
 LANGUAGE plpgsql
AS $function$
 	/*
 Function/Procedure name: cluster_smart.cluster_name_store_attr_list
 Created by: Hemant Kumar Singh
 Created at: 29-Jan-2024
 Updated at: 29-Jan-2024
 No of input parameter: 2
 Parameter Description : $1 = integer, $2 = str
 
 Purpose: This function been created to getting store attributes list
 
 Calling Statement:
 
SELECT cluster_smart.cluster_name_store_attr_list(74,'US');
 
 
 Hemant Kumar SIngh:getting cluster and level list 
 */
 declare
 	_query_combine text;
 	begin
 		_query_combine := 'SELECT array_agg(distinct cluster_name) as cluster_name
							FROM cluster_smart.plan_cluster_bucket_map 
							where cluster_plan_code =' || $1 ||' and special_classification =''store'' and cluster_name like ''%'||$2||'%''
 							';
 		raise notice '%', _query_combine;
 		RETURN QUERY execute _query_combine;
  	end
 $function$
;