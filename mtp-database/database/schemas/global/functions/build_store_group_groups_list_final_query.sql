--liquibase formatted sql
--changeset shreeraksha.n@impactanalytics.co:build_store_group_groups_list_final_query runOnChange:true stripComments:false splitStatements:false context:MTP-121400 labels:MTP-121400
--comment: added is_default to select statements and updated query to use store_group_view for multi-channel support
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.build_store_group_groups_list_final_query(input integer, text, text, text, boolean);
CREATE OR REPLACE FUNCTION global.build_store_group_groups_list_final_query(input integer, text, text, text, boolean)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
 declare
 	_sg_code integer := $1;
 	_query_sg text := $2;
 	_filter_con text := $3;
 	_query_table_filters text := $4;
 	_psa_flag bool := $5;
 	_query_combine text;
 	begin
 		if _psa_flag = true then
 			_query_combine := 'SELECT * FROM (
		        select
		            sg.*,
		            sgm.is_mapped
		        from
		            (
		            select
		                sgmain.sg_code,
		                sgmain.name,
		                sgmain.special_classification,
						sgmain.channel,
		                sgmmain.store_count as store_count,
						sgmmain.psa_name_count as psa_name_count,
		                sgmain.created_at,
		                sgmain.updated_at,
		                um.name as created_by, 
						umup.name as updated_by,
						sgmain.is_default
		            from
		                (
		                select sg_code, name, special_classification, created_at, updated_at, channel, created_by, updated_by, is_default
		                from
		                (select * from "global".store_groups where sg_code in ( select sg_code from "global".store_group_view
		                  ' || _query_sg ||' AND sg_code != '|| _sg_code ||'))sg
		                ) sgmain
		                left join (select user_code, name from "global".user_master um  where  (um.is_deleted::bool = ''false''::bool) ) um
		                on sgmain.created_by = um.user_code 
		                left join (select user_code, name from "global".user_master um  where  (um.is_deleted::bool = ''false''::bool) ) umup
		                on sgmain.updated_by = umup.user_code
		                join
		                (
		                    select
			 					sg_code,
			 					sum(store_count) store_count,
								count(distinct psa_name) as psa_name_count,
			 					count(distinct sg_code) as sg_count
			 				from
			 					"global".aggregated_store_groups_mapping sgm
			 				left join (select psa_code, psa_name from "global".product_store_attributes_filter group by (psa_code, psa_name)) psa
			 					on sgm.psa_code = psa.psa_code
			 				group by
			 					sg_code
		                )sgmmain
		                on sgmain.sg_code = sgmmain.sg_code
		            ) sg
		        ' || _filter_con || '
		        left join (
		            select
		                sg_code,
		                case when sg_code is null then false else true end as is_mapped
		            from
		                "global".store_groups_mapping
		            where
		                sg_code = ' || _sg_code || ' group by 1,2
		            ) sgm on
		            sg.sg_code = null
		 		) X ' || _query_table_filters;
		else
	  		_query_combine := 'SELECT * FROM (
		        select
		            sg.*,
		            sgm.is_mapped
		        from
		            (
		            select
		                sgmain.sg_code,
		                sgmain.name,
		                sgmain.special_classification,
						sgmain.channel,
		                sgmmain.store_count as store_count,
		                sgmain.created_at,
		                sgmain.updated_at,
		                um.name as created_by, 
						umup.name as updated_by,
						sgmain.is_default
		            from
		                (
		                select sg_code, name, special_classification, created_at, updated_at, channel, created_by, updated_by, is_default
		                from
		                (select * from "global".store_groups where sg_code in ( select sg_code from "global".store_group_view
		                  ' || _query_sg ||' AND sg_code != '|| _sg_code ||'))sg 
		                ) sgmain
		                left join (select user_code, name from "global".user_master um  where  (um.is_deleted::bool = ''false''::bool) ) um
		                on sgmain.created_by = um.user_code 
		                left join (select user_code, name from "global".user_master um  where  (um.is_deleted::bool = ''false''::bool) ) umup
		                on sgmain.updated_by = umup.user_code
		                join
		                (
		                    select sg_code, count(distinct store_code) as store_count
		                    from 
		                    "global".store_groups_mapping 
		                    group by sg_code
		                )sgmmain
		                on sgmain.sg_code = sgmmain.sg_code
		            ) sg
		        ' || _filter_con || '
		        left join (
		            select
		                sg_code,
		                ref_sg_code,
		                case when sg_code is null then false else true end as is_mapped
		            from
		                "global".store_groups_mapping
		            where
		                sg_code = ' || _sg_code || ' group by 1,2
		            ) sgm on
		            sg.sg_code = sgm.ref_sg_code
		 		) X ' || _query_table_filters;
	 	end if;
 		raise notice '%',_query_combine;
 		return _query_combine;
 	end
$function$
;
