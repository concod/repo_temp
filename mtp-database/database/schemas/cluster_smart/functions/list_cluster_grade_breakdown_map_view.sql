--liquibase formatted sql
--changeset liquibase:list_cluster_grade_breakdown_map_view_add_region_v2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for list_cluster_grade_breakdown_map_view_add_region_v2
--rollback: SELECT 1
DROP FUNCTION IF EXISTS cluster_smart.list_cluster_grade_breakdown_map_view(input integer, integer, integer);
CREATE OR REPLACE FUNCTION cluster_smart.list_cluster_grade_breakdown_map_view(input integer, integer, integer)
 RETURNS TABLE(store_code character varying, store_name character varying, latitude double precision, longitude double precision, region character varying, channel character varying, attribute_cluster_name character varying, performance_cluster_name character varying)
 LANGUAGE plpgsql
AS $function$

/*
		Function/Procedure name: cluster_smart.list_cluster_grade_breakdown_map_view
		Created by: Mohammed Ayaz
		Created at: 18-Nov-2022
		No of input parameter: 3
		Parameter Description :
				$1 = integer cluster_plan_code,
				$2 = integer attribute_bucket_id,
				$3 = integer performance_bucket_id,
				$4 = where_clause, optional

		Purpose: This function been created to fetch the data from store_attribute_filters tables for mapview.
			returns store_code, store_name, lat, long, region, channel, performance_cluster_name, attribute_cluster_name

		Calling Statement:

		select * from cluster_smart.list_cluster_grade_breakdown_map_view(26,6,6);

		Updated_by Updated_on Purpose
		Vishal H 29-03-2026: to fetch the data from store_attribute_filters tables for mapview and region column.

		*/

declare
	_query text := '';
	_where text := '';
	_region_exists boolean;
	_region_field text;
	begin

		-- Check if region column exists in store_attributes_filter table
		SELECT EXISTS (
			SELECT 1 
			FROM information_schema.columns 
			WHERE table_schema = 'global' 
			AND table_name = 'store_attributes_filter' 
			AND column_name = 'region'
		) INTO _region_exists;

		-- Set region field based on column existence
		IF _region_exists THEN
			_region_field := 'saf.region';
		ELSE
			_region_field := '''''::character varying';
		END IF;

		_query = '
				select
			 			store_code,
						store_name,
						latitude,
						longitude,
						region,
						channel,
						attribute_cluster_name,
						performance_cluster_name
		from
			(
			select
							saf.store_code,
							saf.store_name,
							saf.latitude ::double precision AS latitude,
							saf.longitude ::double precision AS longitude,
							' || _region_field || ' as region,
							saf.channel,
							cluster_product.cluster_name attribute_cluster_name,
							pcbm.cluster_name as performance_cluster_name
						from
							cluster_smart.plan_cluster_bucket_map_attributes pcbma
							join cluster_smart.plan_cluster_bucket_map pcbm
							on pcbma.cluster_bucket_code = pcbm.cluster_bucket_code
							join cluster_smart.plan_cluster_grade_attributes pcga
							on pcbm.cluster_plan_code = pcga.cluster_plan_code
							and pcga.special_classification =pcbm.special_classification 
							join "global".store_attributes_filter saf
							on pcga.store_code = saf.store_code
							join  
							(select 
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
										    cluster_plan_code =' || $1 ||'
										and special_classification = ''product''
									and bucket_id = '''|| $2 ||''' ) cluster_product
							on cluster_product.store_code =  saf.store_code		
							and pcbma.attribute_value = saf.store_code	
			 where
				pcbm.cluster_plan_code = ' || $1 ||'
				and bucket_id = '''|| $3 ||'''
				and pcbm.special_classification = ''performance''
				) main
				--where store_code = pcga.store_code
				group by 
				store_code,
						store_name,
							performance_cluster_name,
							latitude,
							longitude,
							region,
							channel,
							attribute_cluster_name;';
		raise notice '%', _query;
		return query execute _query;
	end
$function$
;