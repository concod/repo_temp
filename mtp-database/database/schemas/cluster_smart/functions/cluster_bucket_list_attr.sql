--liquibase formatted sql
--changeset  hemant.kumar@impactanalytics.co:cluster_smart.cluster_bucket_list_attr liquibase:cluster_bucket_list_attr runOnChange:true stripComments:false splitStatements:false context:MTP-21447 labels:liquibase_project_start
--comment: initial changeset for cluster_bucket_list_attr
--rollback: SELECT 1
DROP FUNCTION IF EXISTS cluster_smart.cluster_bucket_list_attr(input integer, text);
CREATE OR REPLACE FUNCTION cluster_smart.cluster_bucket_list_attr(input integer, text)
 RETURNS TABLE(bucket_id character varying, is_optimal boolean, is_final boolean, special_classification character varying, bucket_attribute_value jsonb)
 LANGUAGE plpgsql
AS $function$
  declare
  	_query text := '';
  	_is_channels text := '';
  	
  begin
  	if length($2) > 0 then 
  		_is_channels= 'where channel ='''||$2 || ''' ';
  	end if;
  _query= '
  		 select bucket_id, is_optimal, is_final, special_classification,bucket_attribute_value from (
  			select *, substring(cluster_name,1,length(cluster_name)-(position('' '' in reverse(cluster_name)))) channel 
  			from cluster_smart.plan_cluster_bucket_map
  		 	where cluster_plan_code = ' || $1 ||' and special_classification =''product'' ) as pcbm
  			'|| _is_channels ||'
  		group by bucket_id, is_optimal, is_final, special_classification,bucket_attribute_value;';
  	raise notice '%', _query;
  	return query execute _query;
  end $function$
;