--liquibase formatted sql
--changeset hemant.kumar@impactanalytics.co:cluster_smart.cluster_bucket_list_perf liquibase:cluster_bucket_list_perf runOnChange:true stripComments:false splitStatements:false context:MTP-21447 labels:liquibase_project_start
--comment: initial changeset for cluster_bucket_list_perf
--rollback: SELECT 1
DROP FUNCTION IF EXISTS cluster_smart.cluster_bucket_list_perf(input integer, text);
CREATE OR REPLACE FUNCTION cluster_smart.cluster_bucket_list_perf(input integer, text)
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
 		 select bucket_id,is_optimal,is_final,special_classification,bucket_attribute_value from (
 			select pc.bucket_id,pc.is_optimal,pc.is_final,pc.special_classification,pc.bucket_attribute_value,
 			        pc.cluster_name,case when split_part(cluster_name,'','',1)=cluster_name then pcgrid.channel else split_part(cluster_name,'','',1) end as channels ,pcgrid.attribute_name, pcgrid.channel,
 			        sum(pcgrid.attribute_value) from
 			  (select * from cluster_smart.plan_cluster_bucket_map_attributes ) pcm
 			 join
 			  (select * from
 			   cluster_smart.plan_cluster_bucket_map
 			   where cluster_plan_code = ' || $1 ||' and special_classification=''performance''
 			  ) pc
 			 on pc.cluster_bucket_code = pcm.cluster_bucket_code
 			 join
 			  (
 			   select a.store_code, attribute_value::float, attribute_name,channel from cluster_smart.plan_cluster_grade_attributes as a
 			   join
 			   (
 			    SELECT store_code,attribute_value as channel FROM "global".store_attributes x
 			    where attribute_name =''channel''
 			   ) as b on a.store_code = b.store_code
 			   where special_classification = ''performance'' and cluster_plan_code = ' || $1 ||' and attribute_name like ''%retail''
 			  ) pcgrid
 			 on pcgrid.store_code = pcm.attribute_value
 			 group by pc.cluster_name, pcgrid.attribute_name,pcgrid.channel,pc.bucket_id,pc.is_optimal,pc.is_final,pc.special_classification,pc.bucket_attribute_value
 			 ) as pc
 			 '|| _is_channels ||'
 			 group by bucket_id,is_optimal,is_final,special_classification,pc.channel,pc.bucket_attribute_value';
 	raise notice '%', _query;
 	return query execute _query;
 end $function$
;
