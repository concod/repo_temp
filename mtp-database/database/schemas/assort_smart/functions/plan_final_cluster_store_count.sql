--liquibase formatted sql
--changeset liquibase:plan_final_cluster_store_count runOnChange:true stripComments:false splitStatements:false context:MTP-23720 labels:liquibase_project_start
--comment: initial changeset for plan_final_cluster_store_count
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort_smart.plan_final_cluster_store_count(input integer);
CREATE OR REPLACE FUNCTION assort_smart.plan_final_cluster_store_count(input integer)
 RETURNS TABLE(store_codes bigint)
 LANGUAGE plpgsql
AS $function$
declare
	_query_combine text;
	begin
		_query_combine := 'select
							count(pcsf.attribute_value) as store_codes
						from
							cluster_smart.plan_cluster_final pcf
						join cluster_smart.plan_cluster_store_final pcsf 
						 							on
							pcf.cluster_code_id = pcsf.cluster_code_id
						where
							cluster_plan_code = ' || $1 ||'
							and pcsf.attribute_name = ''store_code''
				
							';
		raise notice '%', _query_combine;
		RETURN QUERY execute _query_combine;
 	end
$function$
;
