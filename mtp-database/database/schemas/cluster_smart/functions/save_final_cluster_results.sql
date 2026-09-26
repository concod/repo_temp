--liquibase formatted sql
--changeset hemanth.cs@impactanalytics.co:cluster_smart.save_final_cluster_results liquibase:fixed_final_save_api runOnChange:true stripComments:false splitStatements:false context:MTP-84779 labels:liquibase_project_start
--comment: update changeset to exclude ecom channels from the delete query
--rollback: SELECT 1
DROP FUNCTION IF EXISTS cluster_smart.save_final_cluster_results(input integer, jsonb, jsonb);
CREATE OR REPLACE FUNCTION cluster_smart.save_final_cluster_results(input integer, jsonb, jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
	/*
Function/Procedure name: cluster_smart.save_final_cluster_results
Created by: Hemant Kumar Singh
Created at: 14-Nov-2022
Updated by: Hemanth C S
Updated at: 07-May-2025
No of input parameter: 3
Parameter Description : $1 = plan code , $2= json  , $3 = json 
​
Purpose: This function been created to getting saving final cluster result   
​
Calling Statement:
SELECT cluster_smart.save_final_cluster_results(61,'{"US":{"attribute_bucket_id":3,"performance_bucket_id":3}}','{"NEW US A2":{"attribute_bucket_id":"US A","performance_bucket_id":"2"},"US A3":{"attribute_bucket_id":"US A","performance_bucket_id":"3"},"US B2":{"attribute_bucket_id":"US B","performance_bucket_id":"2"},"US B3":{"attribute_bucket_id":"US B","performance_bucket_id":"3"},"US C1":{"attribute_bucket_id":"US C","performance_bucket_id":"1"},"US C2":{"attribute_bucket_id":"US C","performance_bucket_id":"2"},"US C3":{"attribute_bucket_id":"US C","performance_bucket_id":"3"}}');
​
​
Hemant Kumar SIngh:getting saving final cluster result  
*/
declare
	_delete_query text;
	_query text;
	_query_attr text;
	_bucket_save_query text;
	_count int;
begin
	raise notice '%',length($3::text);
	
	select count (a.aa) into _count  from ( select length(json_object_keys($3::json)) aa) a;
	
	_delete_query := 'with channels as (
								  select json_array_elements_text((attribute_value->''value'')::json) as channel_name 
								  from global.tenant_attribute_master 
								  where name = ''all_possible_ecomm_channels''
								  )
								  delete from cluster_smart.plan_cluster_final pcf
								  where pcf.cluster_plan_code = ' || $1 || '
								  and not exists (select 1 from channels where pcf.cluster_name ilike ''%'' || channel_name || ''%''
								  );';
	EXECUTE _delete_query;
	RAISE NOTICE 'Deleted existing records for cluster plan: %', $1;

	if _count >0 then 
		_query := 'INSERT INTO cluster_smart.plan_cluster_final (cluster_plan_code, attribute_value, cluster_name )
				(
				 select '|| $1 ||', jsonb_build_object(''cluster_display_name'',a.key) as attribute_value  ,trim(concat(jsonb(a.value)->>''attribute_bucket_id'',jsonb(a.value)->>''performance_bucket_id'','' '',jsonb(a.value)->>''store_bucket_id'' )) as cluster_name from jsonb_each_text('''|| $3 ||''') as a
				)
				';
			raise notice ' plan cluster store final % ', _query;
			execute _query;
			
	else
		_query := 'INSERT INTO cluster_smart.plan_cluster_final (cluster_name, cluster_plan_code)
				   select distinct concat(prd.cluster_name, perf.cluster_name,store_attr.store_cluster_name) as cluster_name, prd.cluster_plan_code as cluster_plan_code
--				prod_bucket_id,perf_bucket_id,channel
				from
				(
				 select pcb.cluster_plan_code, pcb.cluster_name, pcbma.attribute_value as store_code,bucket_id as prod_bucket_id
				 from cluster_smart.plan_cluster_bucket_map pcb
				 join cluster_smart.plan_cluster_bucket_map_attributes pcbma
				 on pcb.cluster_bucket_code = pcbma.cluster_bucket_code
				 where cluster_plan_code= '|| $1 ||' and special_classification = ''product''
				 and pcbma.attribute_name=''store_code''
				) prd
				join
				(
				 select pcb.cluster_plan_code,reverse(split_part(pcb.cluster_name,'' '',1)) as cluster_name, pcbma.attribute_value as store_code,
				 bucket_id as perf_bucket_id
				 from cluster_smart.plan_cluster_bucket_map pcb
				 join cluster_smart.plan_cluster_bucket_map_attributes pcbma
				 on pcb.cluster_bucket_code = pcbma.cluster_bucket_code
				 where cluster_plan_code = '|| $1 ||' and
				 special_classification = ''performance''
				 and pcbma.attribute_name=''store_code''
				) perf
				on prd.cluster_plan_code = perf.cluster_plan_code and prd.store_code = perf.store_code
				join "global".store_attributes_filter sa
				on prd.store_code = sa.store_code
				left join
				(
					select pcb.cluster_plan_code,pcbma.attribute_value as store_code ,
					substring(pcb.cluster_name,(length(channel)+1)) as store_cluster_name
					--case when split_part(pcb.cluster_name,'' '',-1)=cluster_name then cluster_name else split_part(pcb.cluster_name,'' '',-1) end as cluster_name
					from "cluster_smart".plan_cluster_bucket_map pcb
					join
					"cluster_smart".plan_cluster_bucket_map_attributes pcbma
					on pcb.cluster_bucket_code = pcbma.cluster_bucket_code
					JOIN(
					SELECT store_code, channel FROM "global".store_attributes_filter x 
							) as channel
				on  pcbma.attribute_value  = channel.store_code
					where cluster_plan_code = ' || $1 ||'  and 
					special_classification = ''store''
					and pcbma.attribute_name=''store_code''
				) store_attr
				on 
				prd.cluster_plan_code = store_attr.cluster_plan_code and prd.store_code = store_attr.store_code
				join
				(
				 select a.key as channel,jsonb(a.value)->>''performance_bucket_id'' as perf_bucket_id,jsonb(a.value)->>''attribute_bucket_id'' as prod_bucket_id from jsonb_each_text('''|| $2 ||''') as a
				) as bucket
				using(channel,perf_bucket_id,prod_bucket_id);';
				execute _query;
				raise notice ' plan cluster store final % ', _query;
	    end if;
		_query_attr := 'INSERT INTO cluster_smart.plan_cluster_store_final (cluster_code_id, attribute_name, attribute_value)
			select cluster_final.cluster_code_id, ''store_code'' as attribute_name, cluster_res.store_code as attribute_value
			from cluster_smart.plan_cluster_final cluster_final
			join
			(
			select
				concat(prd.cluster_name, perf.cluster_name,store_attr.store_cluster_name) as cluster_name, perf.store_code as store_code,
				channel,prod_bucket_id,perf_bucket_id
				from (
					select pcb.cluster_plan_code, pcb.cluster_name, pcbma.attribute_value as store_code,bucket_id as prod_bucket_id
					from cluster_smart.plan_cluster_bucket_map pcb
					join
					cluster_smart.plan_cluster_bucket_map_attributes pcbma
					on pcb.cluster_bucket_code = pcbma.cluster_bucket_code
						where cluster_plan_code= '|| $1 ||' and special_classification = ''product''
						 and pcbma.attribute_name=''store_code''
				) prd
				join
				(
					select pcb.cluster_plan_code,split_part(pcb.cluster_name,'' '',-1) as cluster_name, pcbma.attribute_value as store_code,
					bucket_id as perf_bucket_id
					from cluster_smart.plan_cluster_bucket_map pcb
					join
					cluster_smart.plan_cluster_bucket_map_attributes pcbma
					on pcb.cluster_bucket_code = pcbma.cluster_bucket_code
					where cluster_plan_code = '|| $1 ||' and
					special_classification = ''performance''
					and pcbma.attribute_name=''store_code''
				) perf
				on prd.cluster_plan_code = perf.cluster_plan_code and prd.store_code = perf.store_code
				join "global".store_attributes_filter sa
				on prd.store_code = sa.store_code
				left join
				(
					select pcb.cluster_plan_code,pcbma.attribute_value as store_code ,
					substring(pcb.cluster_name,(length(channel)+1)) as store_cluster_name
					--case when split_part(pcb.cluster_name,'' '',-1)=cluster_name then cluster_name else split_part(pcb.cluster_name,'' '',-1) end as cluster_name
					from "cluster_smart".plan_cluster_bucket_map pcb
					join
					"cluster_smart".plan_cluster_bucket_map_attributes pcbma
					on pcb.cluster_bucket_code = pcbma.cluster_bucket_code
					JOIN(
					SELECT store_code, channel FROM "global".store_attributes_filter x 
							) as channel
				on  pcbma.attribute_value  = channel.store_code
					where cluster_plan_code = ' || $1 ||'  and 
					special_classification = ''store''
					and pcbma.attribute_name=''store_code''
				) store_attr
				on 
				prd.cluster_plan_code = store_attr.cluster_plan_code and prd.store_code = store_attr.store_code
			) cluster_res
				on
			trim(cluster_final.cluster_name) = cluster_res.cluster_name
			join
			(
			 select a.key as channel,jsonb(a.value)->>''performance_bucket_id'' as perf_bucket_id,jsonb(a.value)->>''attribute_bucket_id'' as prod_bucket_id from jsonb_each_text('''|| $2 ||''') as a
			) as bucket
			using(channel,perf_bucket_id,prod_bucket_id)
			 where cluster_final.cluster_plan_code = '|| $1 ||' ;';
		raise notice ' % ', _query_attr;
		execute _query_attr;
		execute 'update cluster_smart.plan_cluster_bucket_map set is_optimal = false, is_final= false
		          where cluster_plan_code = '|| $1 ||' ;';
		_bucket_save_query := 'UPDATE cluster_smart.plan_cluster_bucket_map pcbm
							SET is_final = true, is_optimal=true
							from 
							(
							 select a.key as channel,jsonb(a.value)->>''performance_bucket_id'' as perf_bucket_id,jsonb(a.value)->>''attribute_bucket_id'' as prod_bucket_id from jsonb_each_text('''|| $2::text ||''') as a
							) as bucket
							WHERE pcbm.cluster_plan_code ='|| $1 ||' and substring(cluster_name,1,length(cluster_name)-(position('' '' in reverse(cluster_name))))=bucket.channel
							and ((pcbm.special_classification = ''performance'' and pcbm.bucket_id=bucket.perf_bucket_id ) or
							(pcbm.special_classification = ''product'' and pcbm.bucket_id = bucket.prod_bucket_id));';
		execute _bucket_save_query;
	-- end if;
end $function$
;
