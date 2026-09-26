--liquibase formatted sql
--changeset liquibase:cluster_attributes_store_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for cluster_attributes_store_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS cluster_smart.cluster_attributes_store_list(input integer, text);
CREATE OR REPLACE FUNCTION cluster_smart.cluster_attributes_store_list(input integer, text)
 RETURNS TABLE(store_code character varying)
 LANGUAGE plpgsql
AS $function$
declare
	_query_combine text;
	begin
		_query_combine := 'SELECT pcbma.attribute_value as store_code
							FROM cluster_smart.plan_cluster_bucket_map pcb
							join cluster_smart.plan_cluster_bucket_map_attributes pcbma
							on pcb.cluster_bucket_code = pcbma.cluster_bucket_code
							where cluster_plan_code =' || $1 ||' and special_classification =''product'' and bucket_id =''' || $2 || '''
							and pcbma.attribute_name =''store_code''
							group by 1';
		raise notice '%', _query_combine;
		RETURN QUERY execute _query_combine;
 	end
$function$
;
