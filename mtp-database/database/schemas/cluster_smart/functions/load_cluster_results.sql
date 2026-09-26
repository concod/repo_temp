--liquibase formatted sql
--changeset hemanth.cs@impactanalytics.co:cluster_smart.load_cluster_results_fix liquibase:load_cluster_results runOnChange:true stripComments:false splitStatements:false context:MTP-77657 labels:liquibase_project_start
--comment: fix for load_cluster_results delete statement
--rollback: SELECT 1
DROP FUNCTION IF EXISTS cluster_smart.load_cluster_results(input integer, text);
/*
Function/Procedure name: cluster_smart.load_cluster_results
Created by: Hemanth C S
Created at: 27-10-2023
Updated at: 27-10-2023  
No of input parameter: 2
Parameter Description : 
    $1 = plan_code 
    $2 = special_classification
Purpose: This function is used to store data from temp table to permanent table 
temp :  temp_cluster
permanent tables: plan_cluster_bucket_map
                  plan_cluster_bucket_map_attributes
Calling Statement:
SELECT cluster_smart.load_cluster_results(25,'performance');
*/
CREATE OR REPLACE FUNCTION cluster_smart.load_cluster_results(input integer, text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
 declare
     _master_query text;
     _map_query text;
 begin
 	execute 'DELETE from cluster_smart.plan_cluster_bucket_map where cluster_plan_code = ' || $1 ||' and special_classification = '''|| $2 ||''';';
     _master_query := 'insert into cluster_smart.plan_cluster_bucket_map (cluster_plan_code, cluster_name, bucket_id, special_classification , is_optimal, bucket_attribute_value)
     						select cluster_plan_code, label as cluster_name, k as bucket_id, special_classification, is_optimal as is_optimal, bucket_attribute_value::jsonb as bucket_attribute_value from cluster_smart.temp_cluster
							where cluster_plan_code = ' || $1 ||' and special_classification = '''|| $2 ||'''
 						group by cluster_plan_code, k, label, is_optimal, bucket_attribute_value,special_classification ;';

     execute _master_query;
     _map_query := 'insert into cluster_smart.plan_cluster_bucket_map_attributes (cluster_bucket_code, attribute_name, attribute_value)
     (
 	select cba.cluster_bucket_code as cluster_bucket_code, cr.attribute_name as attribute_name, cr.attribute_value as attribute_value from  cluster_smart.temp_cluster as cr join
     cluster_smart.plan_cluster_bucket_map cba on
 	cba.bucket_id::text = cr.k::text and cba.cluster_name::text = cr."label"::text
 	where cba.cluster_plan_code = ' || $1 ||'
 		and cba.special_classification = '''|| $2 ||''' );';
     execute _map_query;
     execute 'DELETE from cluster_smart.temp_cluster where cluster_plan_code = ' || $1 ||' and special_classification = '''|| $2 ||''';';
 end $function$
;
