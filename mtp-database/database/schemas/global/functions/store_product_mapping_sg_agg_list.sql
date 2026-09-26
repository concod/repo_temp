--liquibase formatted sql
--changeset liquibase:store_product_mapping_sg_agg_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_product_mapping_sg_agg_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.store_product_mapping_sg_agg_list(input jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION global.store_product_mapping_sg_agg_list(input jsonb, jsonb, jsonb)
 RETURNS TABLE(sg_code integer, name character varying, special_classification character varying, store_count bigint, sg_count bigint, mapped_products_count integer)
 LANGUAGE plpgsql
AS $function$
	declare
	_query_sm text := '';
	_query_sa text := '';
	_query_table_filters text := '';
	_query_combine text := '';
	_main_filter_cnt int := 0;
	_attr_filter_cnt int := 0;
	_filter_con text := ' ';
	begin
		SELECT count(*) INTO _main_filter_cnt from jsonb_each_text($1);
		SELECT count(*) INTO _attr_filter_cnt from jsonb_each_text($2);
		raise notice '%,%', _main_filter_cnt, _attr_filter_cnt;
		_query_table_filters := global.form_table_query($3);
	 	if 	_main_filter_cnt = 0 and _attr_filter_cnt != 0 then
	 		_query_sa := global.form_attribute_table_filters_v2('store_attributes', 'store_code', $2);
	 		_filter_con := ' JOIN (SELECT sgm.sg_code FROM (' || _query_sa || ') x JOIN "global".store_groups_mapping sgm ON x.store_code = sgm.store_code group by sgm.sg_code) f ON sg.sg_code = f.sg_code ';
	 	elseif 	_main_filter_cnt != 0 and _attr_filter_cnt = 0 then
	 		_query_sm := 'SELECT * FROM global.store_master' || (global.form_main_table_filters('store_master', $1));
	 		_filter_con := ' JOIN (SELECT sgm.sg_code FROM (' || _query_sm || ') x JOIN "global".store_groups_mapping sgm ON x.store_code = sgm.store_code group by sgm.sg_code) f ON sg.sg_code = f.sg_code ';
	 	elseif 	_main_filter_cnt != 0 and _attr_filter_cnt != 0 then
	 		_query_sm := 'SELECT * FROM global.store_master' || (global.form_main_table_filters('store_master', $1));
	 		_query_sa := global.form_attribute_table_filters_v2('store_attributes', 'store_code', $2);
	 		_filter_con := ' JOIN (SELECT sgm.sg_code FROM (' || _query_sm || ') x JOIN (' || _query_sa || ') y on x.store_code = y.store_code join "global".store_groups_mapping sgm ON x.store_code = sgm.store_code group by sgm.sg_code) f ON sg.sg_code = f.sg_code ';
		 end if;
 		_query_combine := 'SELECT * FROM (
			select
				sg.*,
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
				where
					is_deleted = false) sg'
 			|| _filter_con ||
			'left join (
				select
					sg_code,
					count(distinct store_code) as store_count,
					count(distinct ref_sg_code) as sg_count
				from
					"global".store_groups_mapping
				group by
					sg_code) sgm on
				sg.sg_code = sgm.sg_code
			left join (
				select
					sgm.sg_code,
					count(distinct product_code) as mapped_products_count
				from
					global.store_groups_mapping sgm
				join global.product_store_mapping psm
				on
					sgm.store_code = psm.store_code
				group by
					sgm.sg_code) sgm2 on
				sg.sg_code = sgm2.sg_code
			) X ' || _query_table_filters;
		raise notice '%',_query_combine;
		return query execute _query_combine;
	end $function$
;
