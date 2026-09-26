--liquibase formatted sql
--changeset liquibase:load_cluster_results runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for load_cluster_results
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort.load_cluster_results(input text, text, integer);
/*
    Load cluster results from ada cluster table
    Author : Pradeep Nayak
    Update:
    cluster bucket id typecasting to "text" instead of character
*/

CREATE OR REPLACE FUNCTION assort.load_cluster_results(input text, text, integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
    _master_query text;
    _map_query text;
begin
	execute 'DELETE from "assort".plan_cluster_bucket_map where plan_code = ' || $3 ||' and special_classification = '''|| $2 ||''';';
    _master_query := 'insert into "assort".plan_cluster_bucket_map (plan_code, cluster_name, bucket_id, special_classification , is_optimal)
    select plan_code, label as cluster_name, k as bucket_id, '''|| $2 ||''' as special_classification, is_optimal as is_optimal from ' || $1 ||' group by plan_code, k, label, is_optimal ;';
    execute _master_query;
    _map_query := 'insert into "assort".plan_cluster_bucket_map_attributes (cluster_bucket_code, attribute_name, attribute_value)
    (
	select cba.cluster_bucket_code as cluster_bucket_code, cluster_results.attribute_name as attribute_name, cluster_results.attribute_value as attribute_value from ' || $1 || ' cluster_results join
    "assort".plan_cluster_bucket_map cba on 
	cba.bucket_id::text = cluster_results.k::text and cba.cluster_name::text = cluster_results."label"::text
	where cba.plan_code = ' || $3 ||' and cba.special_classification = '''|| $2 ||''');';
    execute _map_query;
end $function$

;