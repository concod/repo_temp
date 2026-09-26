--liquibase formatted sql
--changeset liquibase:product_store_mapping_pg_agg_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_store_mapping_pg_agg_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.product_store_mapping_pg_agg_list(input jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION global.product_store_mapping_pg_agg_list(input jsonb, jsonb, jsonb)
 RETURNS TABLE(pg_code integer, name character varying, special_classification character varying, selection_metadata json, product_count bigint, pg_count bigint)
 LANGUAGE plpgsql
AS $function$
	declare
	_query_pm text := '';
	_query_pa text := '';
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
	 		_query_pa := global.form_attribute_table_filters_v2('product_attributes', 'product_code', $2);
	 		_filter_con := ' JOIN (SELECT pgm.pg_code FROM (' || _query_pa || ') x JOIN "global".product_groups_mapping pgm ON x.product_code = pgm.product_code group by pgm.pg_code) f ON pg.pg_code = f.pg_code ';
	 	elseif 	_main_filter_cnt != 0 and _attr_filter_cnt = 0 then
	 		_query_pm := 'SELECT * FROM global.product_master' || (global.form_main_table_filters('product_master', $1));
	 		_filter_con := ' JOIN (SELECT pgm.pg_code FROM (' || _query_pm || ') x JOIN "global".product_groups_mapping pgm ON x.product_code = pgm.product_code group by pgm.pg_code) f ON pg.pg_code = f.pg_code ';
	 	elseif 	_main_filter_cnt != 0 and _attr_filter_cnt != 0 then
	 		_query_pm := 'SELECT * FROM global.product_master' || (global.form_main_table_filters('product_master', $1));
	 		_query_pa := global.form_attribute_table_filters_v2('product_attributes', 'product_code', $2);
	 		_filter_con := ' JOIN (SELECT pgm.pg_code FROM (' || _query_pm || ') x JOIN (' || _query_pa || ') y on x.product_code = y.product_code join "global".product_groups_mapping pgm ON x.product_code = pgm.product_code group by pgm.pg_code) f ON pg.pg_code = f.pg_code ';
		 end if;
 		_query_combine := 'SELECT * FROM (
			select
				pg.*,
				pgm.product_count,
				pgm.pg_count
				--pgm2.mapped_stores_count::int4
			from
				(
				select
					pg_code,
					name,
					special_classification,
					selection_metadata
				from
					"global".product_groups
				where
					is_deleted = false) pg'
 			|| _filter_con ||
			'left join (
				select
					pg_code,
					count(distinct product_code) as product_count,
					count(distinct ref_pg_code) as pg_count
				from
					"global".product_groups_mapping
				group by
					pg_code) pgm on
				pg.pg_code = pgm.pg_code
			/*left join (
				select
					pgm.pg_code,
					count(distinct store_code) as mapped_stores_count
				from
					global.product_groups_mapping pgm
				join global.product_store_mapping psm
				on
					pgm.product_code = psm.product_code
				group by
					pgm.pg_code) pgm2 on
				pg.pg_code = pgm2.pg_code*/) X ' || _query_table_filters;
		raise notice '%',_query_combine;
		return query execute _query_combine;
	end $function$
;
