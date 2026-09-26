--liquibase formatted sql
--changeset hemant.kumar@impactanalytics.co:cluster_smart.cluster_attributes_store_attr_list liquibase:cluster_attributes_store_attr_list runOnChange:true stripComments:false splitStatements:false context:MTP-34368 labels:liquibase_project_start
--comment: initial changeset for cluster_attributes_store_attr_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS cluster_smart.cluster_attributes_store_attr_list(input integer, text, jsonb);
CREATE OR REPLACE FUNCTION cluster_smart.cluster_attributes_store_attr_list(input integer, text, jsonb)
 RETURNS TABLE(store_code character varying)
 LANGUAGE plpgsql
AS $function$
 	/*
 Function/Procedure name: cluster_smart.cluster_attributes_store_attr_list
 Created by: Hemant Kumar Singh
 Created at: 29-Jan-2024
 Updated at: 29-Jan-2024
 No of input parameter: 3
 Parameter Description : $1 = integer, $2 = str, $3= jsonb
 
 Purpose: This function been created to getting store attributes list
 
 Calling Statement:
 
SELECT cluster_smart.cluster_attributes_store_attr_list(74,'5','[{"attribute_name": "cluster_name", "value": ["US South HOT", "US Florida HOT"], "operator": "in"}]');
 
 Hemant Kumar SIngh:getting cluster and level list 
 */
declare
	_query_combine text;
 	_where text;
 	_input_data jsonb;
 	_filter_data jsonb;
	begin
		_where:=null;
 		_input_data:= $3::jsonb;
     	-- prepare where clause
        _where:=(select * from cluster_smart.prepare_where_clause_from_json_filters(_input_data) );
		raise notice '%', _where;
		_query_combine := 'select cp.store_code from (
								(SELECT pcbma.attribute_value as store_code
															FROM cluster_smart.plan_cluster_bucket_map pcb
															join cluster_smart.plan_cluster_bucket_map_attributes pcbma
															on pcb.cluster_bucket_code = pcbma.cluster_bucket_code
															where cluster_plan_code =' || $1 ||' and special_classification =''product'' and bucket_id =''' || $2 || '''
															and pcbma.attribute_name =''store_code''
															group by 1) cp
								join 
								(SELECT pcbma.attribute_value as store_code
															FROM cluster_smart.plan_cluster_bucket_map pcb
															join cluster_smart.plan_cluster_bucket_map_attributes pcbma
															on pcb.cluster_bucket_code = pcbma.cluster_bucket_code
															' || _where ||' and cluster_plan_code =' || $1 ||' and special_classification =''store'' 
															and pcbma.attribute_name =''store_code''
															group by 1) cs
								on cp.store_code = cs.store_code
								)';
		raise notice '%', _query_combine;
		RETURN QUERY execute _query_combine;
 	end
$function$
;