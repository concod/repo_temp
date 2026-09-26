--liquibase formatted sql
--changeset mohammed.ayaz@impactanalytics.co:cluster_rollup runOnChange:true stripComments:false splitStatements:false context:MTP-13310,MTP-24721, MTP-MTP-36529, MTP-45758 labels:cluster_buyrollup - add season, plan_name change, fixes duplicate store_codes, optimize SP
--comment: initial changeset for cluster_rollup, add season field & cluster_plan name. Supports multiple plan, remove store_duplicates, optimize sp
--rollback: SELECT 1

DROP FUNCTION IF EXISTS cluster_smart.cluster_rollup(input integer[]);
CREATE OR REPLACE FUNCTION cluster_smart.cluster_rollup(input integer[])
 RETURNS TABLE(cluster_plan_code integer, cluster_name character varying, cluster_display_name jsonb, store_code character varying, channel character varying, store_name character varying, metrics jsonb, level_value character varying, level_name character varying, plan_name character varying)
 LANGUAGE plpgsql
AS $function$
 	/*
        Function/Procedure name: cluster_smart.cluster_rollup
        No of input parameter: 4
        Parameter Description : $1 = plan code , $2= attribute_bucket_id , $3= performance_bucket_id, $4= channels
​
        Purpose: This function been created to getting cluster's store data
​
        Calling Statement:
        	select * from cluster_smart.cluster_rollup('{335}');
​
        Hemant Kumar Singh: getting cluster grade breakdown details

		Updated by : Mohammed Ayaz
		on : Mon 19 Feb 24
		purpose: to support multiple plans and removing store_code and plan_cluster_duplicates, otpimize SP
        */
declare
		_query text := '';
		begin
		_query = '
				select 
					cluster_final.cluster_plan_code,
					cluster_final.cluster_name,
					 cluster_display_name,
					cluster_grade.store_code as store_code,
					cluster_grade.channel,
					cluster_grade.store_name,
					jsonb_object_agg(cluster_grade.attribute_name,
					cluster_grade.attribute_value) as metrics,
					cpa.attribute_value as level_name,
					cpa.attribute_name as level_value,
					plan_master.plan_name as plan_name

					from (
					select
					cluster_plan_code,
					cluster_code_id,
					cluster_name,
					attribute_value as cluster_display_name
					from
					cluster_smart.plan_cluster_final
						where cluster_plan_code in (' || (ARRAY_TO_STRING($1, ', ', '')) || '))  cluster_final
				join
			 (
				select
					distinct  plan_cls_grd.store_code,
					plan_cls_grd.attribute_name,
					plan_cls_grd.attribute_value,
					channel,
					store_name,
					b.cluster_code_id
						from
					(select
					plan_cluster_grade_attributes.store_code,
					attribute_name,
					attribute_value
					from cluster_smart.plan_cluster_grade_attributes where cluster_plan_code in (' || (ARRAY_TO_STRING($1, ', ', '')) || ')) plan_cls_grd
						join
	(
		select
			final_store_cluster.store_code,
			store_name,
			channel,
			cluster_code_id
		from
	(
			select
				pln_str_fin.attribute_value as store_code,
				pln_str_fin.cluster_code_id
			from
				cluster_smart.plan_cluster_store_final pln_str_fin
			where
				attribute_name = ''store_code'' and cluster_code_id  in
				(select cluster_code_id  from cluster_smart.plan_cluster_final
				where cluster_plan_code  in (' || (ARRAY_TO_STRING($1, ', ', '')) || ')
				) ) as final_store_cluster
		join
		(
			select
				saf.store_code,
				channel,
				store_name
			from
				"global".store_attributes_filter saf) as store_table
				on
			store_table.store_code = final_store_cluster.store_code ) as b
			on
		plan_cls_grd.store_code = b.store_code
				) cluster_grade
				on
				cluster_grade.cluster_code_id = cluster_final.cluster_code_id
				join (
								select cs_cpa.cluster_plan_code, 
									cs_cpa.attribute_value, 
									cs_cpa.attribute_name
								from
								cluster_smart.cluster_plan_attributes cs_cpa
								where cs_cpa.cluster_plan_code in  (' || (ARRAY_TO_STRING($1, ', ', '')) || ') and cs_cpa.attribute_name in
									(''l0_name'', ''l1_name'', ''l2_name'', ''season'')
									) cpa
									on 
									1=1  --to avoid cross join
                    join (
                                select cpm.cluster_plan_code,
                                    cpm.name as plan_name
                                    from cluster_smart.cluster_plan_master cpm
                                where cpm.cluster_plan_code in  (' || (ARRAY_TO_STRING($1, ', ', '')) || ')
                            ) plan_master
                             on
                            1=1  --to avoid cross join

				group by
					cluster_grade.store_code,
					cluster_grade.channel,
					cluster_final.cluster_name,
					cluster_final.cluster_plan_code,
					cluster_grade.store_name,
					cluster_display_name,
					cpa.attribute_value,
					cpa.attribute_name,
                    plan_master.plan_name;';
		raise notice '%', _query;
		return query execute _query;
	end
$function$
;