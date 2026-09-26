--liquibase formatted sql
--changeset jayabharath.reddy@impactanalytics.co:cluster_smart.list_cluster_grade_breakdown liquibase:list_cluster_grade_breakdown runOnChange:true stripComments:false splitStatements:false context:MTP-56212 labels:liquibase_project_start
--comment: changeset for fixing query taking too long to run
--rollback: SELECT 1
DROP FUNCTION IF EXISTS cluster_smart.list_cluster_grade_breakdown(input integer, integer, integer, text);
CREATE OR REPLACE FUNCTION cluster_smart.list_cluster_grade_breakdown(input integer, integer, integer, text)
 RETURNS TABLE(store_code character varying, store_name character varying, performance_cluster_name character varying, metrics jsonb, attribute_cluster_name character varying, store_cluster_name character varying, cluster_display_name text, is_highlight boolean)
 LANGUAGE plpgsql
AS $function$
 	/*
        Function/Procedure name: cluster_smart.list_cluster_grade_breakdown
        No of input parameter: 4
        Parameter Description : $1 = plan code , $2= attribute_bucket_id , $3= performance_bucket_id, $4= channels
​
        Purpose: This function been created to getting cluster's store data
​
        Calling Statement:
        select * from cluster_smart.list_cluster_grade_breakdown( 44, 4, 6, '' );
​
        Hemant Kumar Singh: getting cluster grade breakdown details 
        */
declare
	_query text := '';
	_is_channels text := '';
	_where text := '';
	begin
		if length($4) > 0 then 
			_is_channels= 'where channel ='''||$4 || ''' ';
		end if;
		
		_query = '
				select
				    bucket_data.store_code,
				    bucket_data.store_name,
				    bucket_data.performance_cluster_name,
				    bucket_data.metrics,
				    bucket_data.attribute_cluster_name,
					bucket_data.store_cluster_name_channel as store_cluster_name,
				    case
						when cluster_display_data.cluster_display_name is null then bucket_data.upload_cluster_name
						else cluster_display_data.cluster_display_name
					end as cluster_display_name,
					case
						when bucket_data.is_highlight_perf= bucket_data.is_highlight_prod then True
						else False
					end as is_highlight
				from
				    (
				    select
						cluster_perf_data.attribute_value is_highlight_perf,
 				    	cluster_prod_data.attribute_value is_highlight_prod,
				        store_code,
				        store_name,
				        performance_cluster_name,
				        metrics,
				        attribute_cluster_name,
						store_cluster_name,
				                concat(attribute_cluster_name, reverse(split_part(reverse(performance_cluster_name), '' '', 1)),store_cluster_name) as cluster_name,
						store_cluster_name_channel,
						upload_cluster_name
				    from
				        (
				        select
				              perf.store_code as store_code,
				              perf.store_name as store_name,
				              perf.performance_cluster_name as performance_cluster_name,
				              perf.metrics as metrics,
				              pcbma_attr.cluster_name as attribute_cluster_name,
							store_attr.store_cluster_name as store_cluster_name,
							store_attr.store_cluster_name_channel as store_cluster_name_channel,
				            case
				                when split_part(cluster_name, '','', 1)= cluster_name then perf.channel
				                else split_part(cluster_name, '','', 1)
				            end as channel,
							perf.upload_cluster_name
				        from
				            (
				            select
				                main.store_code,
				                cb_map.cluster_name as performance_cluster_name,
				                channel,
				                jsonb_object_agg(pcga.attribute_name,
				                pcga.attribute_value) as metrics,
				                store_name,
								cb_map.bucket_attribute_value->>''upload_cluster_name'' as upload_cluster_name
				            from
				                (
				                select
				                    attribute_value as store_code,
				                    a.cluster_bucket_code
				                from
				                    cluster_smart.plan_cluster_bucket_map_attributes a
				                    join cluster_smart.plan_cluster_bucket_map b 
				                    on a.cluster_bucket_code =b.cluster_bucket_code
				                where cluster_plan_code = ' || $1 ||') main
				            join (
				                select
				                    *
				                from
				                    cluster_smart.plan_cluster_bucket_map
				                where
				                    cluster_plan_code = ' || $1 ||'
				                    and bucket_id = '''|| $3 ||'''
				                    and special_classification = ''performance'' ) cb_map
				              on
				                main.cluster_bucket_code = cb_map.cluster_bucket_code
				            join (
				                select
				                    plan_cluster_grade_attributes.store_code,
				                    attribute_name,
				                    attribute_value,
				                    channel,
				                    store_name
				                from
				                    cluster_smart.plan_cluster_grade_attributes
				                join
				                    (
				                    select
				                        store_code,
				                        channel,
				                        store_name
				                    from
				                        "global".store_attributes_filter x
				                    ) as b on
				                    plan_cluster_grade_attributes.store_code = b.store_code
				                where
				                    cluster_plan_code = ' || $1 ||'
				                    and special_classification = ''performance'' ) pcga
				              on
				                main.store_code = pcga.store_code
				            group by
				                main.store_code,
				                pcga.channel,
				                cb_map.cluster_name,
				                store_name,
								upload_cluster_name
				                ) perf
				        join (
				            select
				                pcbma.attribute_value as store_code,
				                pcbm.cluster_name,
				                pcbma.cluster_bucket_code
				            from
				                cluster_smart.plan_cluster_bucket_map_attributes pcbma
				            join
				                cluster_smart.plan_cluster_bucket_map pcbm
				              on
				                pcbma.cluster_bucket_code = pcbm.cluster_bucket_code
				            where
				                cluster_plan_code = ' || $1 ||'
				                and special_classification = ''product''
				                and bucket_id = '''|| $2 ||''' ) pcbma_attr
				            on
				              perf.store_code = pcbma_attr.store_code
						left join (
				            select pcb.cluster_plan_code,pcbma.attribute_value as store_code ,
								substring(pcb.cluster_name,(length(channel)+1)) as store_cluster_name,
								pcb.cluster_name as store_cluster_name_channel
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
				              perf.store_code = store_attr.store_code
				        order by
				              attribute_cluster_name,
				              performance_cluster_name,store_cluster_name ) as cluster_brek_table
							  left join (select pcm.cluster_name performance_cluster_name ,pcm.bucket_id ,pcma.attribute_name ,pcma.attribute_value  ,pcm.special_classification 
									FROM cluster_smart.plan_cluster_bucket_map pcm
									join cluster_smart.plan_cluster_bucket_map_attributes pcma
									on pcm.cluster_bucket_code=pcma.cluster_bucket_code
									where pcm.cluster_bucket_code in (
									SELECT cluster_bucket_code
									FROM cluster_smart.plan_cluster_bucket_map_attributes
									where cluster_bucket_code in (SELECT cluster_bucket_code
									FROM cluster_smart.plan_cluster_bucket_map
									where cluster_plan_code =' || $1 ||' and special_classification=''performance'' and bucket_id='''|| $3 ||''') and attribute_name=''is_highlight'')
									and pcma.attribute_name !=''store_code'') as cluster_perf_data
 							using(performance_cluster_name)
 							left join (select pcm.cluster_name attribute_cluster_name ,pcm.bucket_id ,pcma.attribute_name ,pcma.attribute_value  ,pcm.special_classification 
									FROM cluster_smart.plan_cluster_bucket_map pcm
									join cluster_smart.plan_cluster_bucket_map_attributes pcma
									on pcm.cluster_bucket_code=pcma.cluster_bucket_code
									where pcm.cluster_bucket_code in (
									SELECT cluster_bucket_code
									FROM cluster_smart.plan_cluster_bucket_map_attributes
									where cluster_bucket_code in (SELECT cluster_bucket_code
									FROM cluster_smart.plan_cluster_bucket_map
									where cluster_plan_code =' || $1 ||' and special_classification=''product'' and bucket_id='''|| $2 ||''') and attribute_name=''is_highlight'')
									and pcma.attribute_name !=''store_code'') as cluster_prod_data
 							using(attribute_cluster_name)
							'|| _is_channels ||' ) as bucket_data
							left join (select trim(cluster_name) as cluster_name, attribute_value->>''cluster_display_name''::text as cluster_display_name 
							from cluster_smart.plan_cluster_final
							where cluster_plan_code = ' || $1 || '
							group by 1,2) as cluster_display_data
							using(cluster_name)
							order by bucket_data.attribute_cluster_name, bucket_data.performance_cluster_name, bucket_data.store_cluster_name, bucket_data.metrics->>''sales_retail'' desc
							;';
		raise notice '%', _query;
		return query execute _query;
	end
$function$
;
