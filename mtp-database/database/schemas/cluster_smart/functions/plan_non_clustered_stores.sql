--liquibase formatted sql
--changeset liquibase:plan_non_clustered_stores_changes_for_store_attributes_filter runOnChange:true stripComments:false splitStatements:false context:MTP-102479 labels:changes_for_store_attributes_filter
--comment: changes for store_attributes_filter
--rollback: SELECT 1
DROP FUNCTION IF EXISTS cluster_smart.plan_non_clustered_stores(input integer, text, text, text);
CREATE OR REPLACE FUNCTION cluster_smart.plan_non_clustered_stores(input integer, text, text, text)
 RETURNS TABLE(stores_code character varying)
 LANGUAGE plpgsql
AS $function$
declare
_store_group_id integer := 0;
_plan_store_code_query text;
_store_filter_query text;
_main_query text;
_channels text[];
_channels_str text;
_is_channels text := '';
begin
	
	if length($4) > 0 then 
			_is_channels= 'and channel ='''||$4 || ''' ';
		end if;
	
	_plan_store_code_query := 'select attribute_value::int from "cluster_smart".cluster_plan_attributes where cluster_plan_code = ' || $1 || ' 
								and attribute_name = ''store_group_id'';';
	execute	_plan_store_code_query into _store_group_id;
	raise notice 'store group id % ',_store_group_id;
	if _store_group_id = 0 then
		/* if all stores , fetch stores based on channels */
		execute 'select array_remove(channel, ''E-Commerce'') AS channel from "cluster_smart".cluster_plan_master where cluster_plan_code = ' || $1||' ;' into _channels_str;
		_store_filter_query := 'select store_code,channel from "global".store_attributes_filter
							where active = true and channel = any( '''|| _channels_str || '''::text[])';
	else
		_store_filter_query := 'select 
										sgm.store_code,
										saf.channel
									from 
										"global".store_groups_mapping sgm
									left join 
										"global".store_attributes_filter saf
									on 
										sgm.store_code = saf.store_code
									where 
										sgm.sg_code = ' || _store_group_id || ' ';
	end if;
	raise notice '%', _store_filter_query;
	_main_query := 'select sgm.store_code from ( '|| _store_filter_query || ') sgm
		left join
		(
			select perf.store_code as store_code
			from (
				select pcb.cluster_plan_code, pcb.cluster_name, pcbma.attribute_value as store_code 
				from "cluster_smart".plan_cluster_bucket_map pcb
				join
				"cluster_smart".plan_cluster_bucket_map_attributes pcbma
				on pcb.cluster_bucket_code = pcbma.cluster_bucket_code
					where cluster_plan_code= ' || $1 ||' and special_classification = ''product'' 
					and bucket_id = ''' || $2 || ''' and pcbma.attribute_name=''store_code''
			) prd
			join
			(
				select pcb.cluster_plan_code, pcb.cluster_name, pcbma.attribute_value as store_code 
				from "cluster_smart".plan_cluster_bucket_map pcb
				join
				"cluster_smart".plan_cluster_bucket_map_attributes pcbma
				on pcb.cluster_bucket_code = pcbma.cluster_bucket_code
				where cluster_plan_code = ' || $1 ||' and 
				special_classification = ''performance'' and bucket_id='''|| $3||'''
				and pcbma.attribute_name=''store_code''
			) perf
			on 
			prd.cluster_plan_code = perf.cluster_plan_code and prd.store_code = perf.store_code
		) smc
		on sgm.store_code = smc.store_code
		where  smc.store_code is null '|| _is_channels ||';';
	raise notice 'main %', _main_query;
	RETURN QUERY execute _main_query;
end
$function$
;
