--liquibase formatted sql
--changeset liquibase:plan_final_cluster_store_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_final_cluster_store_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS cluster_smart.plan_final_cluster_store_list(input integer);
CREATE OR REPLACE FUNCTION cluster_smart.plan_final_cluster_store_list(input integer)
 RETURNS TABLE(store_code character varying)
 LANGUAGE plpgsql
AS $function$
declare
	_query_combine text;
	begin
		_query_combine := 'SELECT pcsf.attribute_value as store_code
							FROM cluster_smart.plan_cluster_final pcf 
							join cluster_smart.plan_cluster_store_final pcsf 
							on pcf.cluster_code_id = pcsf.cluster_code_id 
							where cluster_plan_code in ( SELECT plan_code FROM assort.plan_attributes 
							where plan_code = ' || $1 ||' and attribute_name =''cluster_plan_code'')
							and pcsf.attribute_name = ''store_code''';
		raise notice '%', _query_combine;
		RETURN QUERY execute _query_combine;
 	end
$function$
;
