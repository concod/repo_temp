--liquibase formatted sql
--changeset arnab.nandy@impactanalytics.co:build_store_product_groups_list_final_query_latency_optimize runOnChange:true stripComments:false splitStatements:false context:MTP-41716 labels:MTP-41716
--comment: changeset for function build_store_product_groups_list_final_query to optimize latency, fetch is_default fix for test
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.build_store_product_groups_list_final_query(input text, text, text, boolean);
CREATE OR REPLACE FUNCTION global.build_store_product_groups_list_final_query(input text, text, text, boolean)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
 declare
 	_query_sg text := $1;
 	_filter_con text := $2;
 	_query_table_filters text := $3;
 	_psa_flag bool := $4;
 	_query_combine text;
 	begin
 		if _psa_flag = true then
 			_query_combine := 'SELECT * FROM (
 		 		select
 				sg.sg_code,
 				sg.name,
 				sg.special_classification,
 				sg.created_at,
 				sg.updated_at,
 				um.name as created_by,
				umup.name as updated_by,
 				COALESCE(f.store_count, 0) as store_count,
 				COALESCE(f.sg_count, 0) as sg_count,
				COALESCE(f.psa_name_count, 0) as psa_name_count,
				sg.channel,
    			sg.is_default
 			from
 				(
 				select
 					sg_code,
 					sg.name,
 					sg.special_classification,
 					sg.created_at,
 					sg.updated_at,
 					sg.created_by,
					sg.channel,
					sg.is_default,
					sg.updated_by
 				from
 					"global".store_groups  sg
				' 
 				|| _query_sg || '  ) sg
 			left join (select user_code, name from "global".user_master um  where  (um.is_deleted::bool = ''false''::bool) ) um
 			on sg.created_by = um.user_code 
			left join (select user_code, name from "global".user_master um  where  (um.is_deleted::bool = ''false''::bool) ) umup
 			on sg.updated_by = umup.user_code '
  			|| _filter_con ||
 			') X ' || _query_table_filters;
		else
	  		_query_combine := 'SELECT * FROM (
	 		 		select
	 				sg.sg_code,
	 				sg.name,
	 				sg.special_classification,
	 				sg.created_at,
	 				sg.updated_at,
	 				um.name as created_by,
					umup.name as updated_by,
	 				COALESCE(sgm.store_count, 0) as store_count,
	 				COALESCE(sgm.sg_count, 0) as sg_count,
					sg.channel,
					sg.is_default
	 			from
	 				(
	 				select
	 					sg_code,
	 					sg.name,
	 					sg.special_classification,
	 					sg.created_at,
	 					sg.updated_at,
	 					sg.created_by,
						sg.channel,
						sg.is_default,
						sg.updated_by 
	 				from
	 					"global".store_groups  sg
					' 
	 				|| _query_sg || '  ) sg
	 			left join (select user_code, name from "global".user_master um  where  (um.is_deleted::bool = ''false''::bool) ) um
	 			on sg.created_by = um.user_code 
				left join (select user_code, name from "global".user_master um  where  (um.is_deleted::bool = ''false''::bool) ) umup
	 			on sg.updated_by = umup.user_code'
	  			|| _filter_con ||
	 			'left join (
	 				select
	 					sg_code,
	 					count(distinct sgm.store_code) as store_count,
	 					count(distinct ref_sg_code) as sg_count
	 				from
	 					"global".store_groups_mapping sgm
	 				group by
	 					sg_code) sgm on
	 				sg.sg_code = sgm.sg_code
	 			) X ' || _query_table_filters;
	 	end if;
 		raise notice '%',_query_combine;
 		return _query_combine;
 	end
$function$
;
