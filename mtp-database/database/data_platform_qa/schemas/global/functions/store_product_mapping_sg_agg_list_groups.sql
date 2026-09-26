--liquibase formatted sql
--changeset liquibase:store_product_mapping_sg_agg_list_groups runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_product_mapping_sg_agg_list_groups
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.store_product_mapping_sg_agg_list_groups(input jsonb, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION global.store_product_mapping_sg_agg_list_groups(input jsonb, jsonb, jsonb, jsonb)
 RETURNS TABLE(sg_code integer, name character varying, special_classification character varying, store_code jsonb, store_count bigint, sg_count bigint, mapped_products_count integer)
 LANGUAGE plpgsql
AS $function$
	/*
		Function to list store groups along with products mapped to each group.
		$1: store group filters
		$2: store main filter.
		$3: store attribute filter.
		$4: table query
	*/
	declare
	_query_sm text := '';
	_query_sa text := '';
	_query_table_filters text := '';
	_query_combine text := '';
	_main_filter_cnt int := 0;
	_attr_filter_cnt int := 0;
	_filter_con text := ' ';
	_group_master_filter text;
	begin
		SELECT count(*) INTO _main_filter_cnt from jsonb_each_text($2);
		SELECT count(*) INTO _attr_filter_cnt from jsonb_each_text($3);

		raise notice '%,%', _main_filter_cnt, _attr_filter_cnt;

		$1 := $1 || ('{"is_deleted": [{"type": "custom", "operator": "=", "values": false}]}'::jsonb);
		_group_master_filter := global.form_main_table_filters('store_groups', $1);
		_query_table_filters := global.form_table_query($4);

	 	if 	_main_filter_cnt = 0 and _attr_filter_cnt != 0 then
	 		_query_sa := global.form_attribute_table_filters_v2('store_attributes', 'store_code', $3);
	 		_filter_con := ' JOIN (SELECT sgm.sg_code FROM (' || _query_sa || ')x JOIN "global".store_groups_mapping sgm ON x.store_code = sgm.store_code group by sgm.sg_code) f ON sg.sg_code = f.sg_code ';
	 	elseif 	_main_filter_cnt != 0 and _attr_filter_cnt = 0 then
	 		_query_sm := 'SELECT * FROM global.store_master' || (global.form_main_table_filters('store_master', $2));
	 		_filter_con := ' JOIN (SELECT sgm.sg_code FROM (' || _query_sm || ') x JOIN "global".store_groups_mapping sgm ON x.store_code = sgm.store_code group by sgm.sg_code) f ON sg.sg_code = f.sg_code ';
	 	elseif 	_main_filter_cnt != 0 and _attr_filter_cnt != 0 then
	 		_query_sm := 'SELECT * FROM global.store_master' || (global.form_main_table_filters('store_master', $2));
	 		_query_sa := global.form_attribute_table_filters_v2('store_attributes', 'store_code', $3);
	 		_filter_con := ' JOIN (SELECT sgm.sg_code FROM (' || _query_sm || ') x JOIN (' || _query_sa || ') y on x.store_code = y.store_code join "global".store_groups_mapping sgm ON x.store_code = sgm.store_code group by sgm.sg_code) f ON sg.sg_code = f.sg_code ';
		 end if;
 		_query_combine := 'SELECT * FROM (
			select
				sg.sg_code,
				sg.name,
				sg.special_classification,
				sgm.store_code::jsonb store_code,
				sgm.store_count,
				sgm.sg_count,
				sgm2.mapped_products_count::int4
			from
				(
				select
					sg_code,
					name,
					special_classification
				from
					"global".store_groups
				' || _group_master_filter || '
					) sg'
 			|| _filter_con ||
			'left join (
				select
					sgmm.sg_code,
					jsonb_agg(distinct sgmm.store_code) store_code,
					(
						select count(store_code) from "global".store_groups_mapping
						where sg_code = sgmm.sg_code
					) as store_count,
					(
						select count(ref_sg_code) from "global".store_groups_mapping
						where sg_code = sgmm.sg_code
					) as sg_count
				from
					"global".store_groups_mapping sgmm 
				group by
					sg_code) sgm on
				sg.sg_code = sgm.sg_code
			left join 
				(
				select	 
					sgm.sg_code,
					sum(psm.cnt_product) as mapped_products_count
				from
					(select count( product_code) cnt_product,
				store_code
					from global.product_store_mapping psm
					group by store_code) psm
					join global.store_groups_mapping sgm
				on
					psm.store_code = sgm.store_code  
					group by sgm.sg_code
				) sgm2 on
				sg.sg_code = sgm2.sg_code
			group by sg.sg_code,
					 sg.name,
					 sg.special_classification,
					 sgm.store_code,
					 sgm.store_count,
					 sgm.sg_count,
					 sgm2.mapped_products_count
			) X ' || _query_table_filters;
		raise notice '%',_query_combine;
		return query execute _query_combine;
	end $function$
;