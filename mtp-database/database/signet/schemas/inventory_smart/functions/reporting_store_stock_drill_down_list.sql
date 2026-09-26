--liquibase formatted sql
--changeset liquibase:reporting_store_stock_drill_down_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for reporting_store_stock_drill_down_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.reporting_store_stock_drill_down_list(input refcursor, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.reporting_store_stock_drill_down_list(input refcursor, jsonb, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$

	declare
		_query_pa text := '';
		_query_sa text := '';
		_query_table_filters text := '';
		_query_combine text := '';
		_cache_payload jsonb := jsonb_build_object('product_attributes', $2, 'store_attributes', $3);
		_cache_table_id text;
		_cache_schema text := 'inventory_smart';
		_cache_sp text := '.reporting_store_stock_drill_down_list';
		_cache_key_pattern text := '{schema_name}:{sp_name}:{request}';
		_cache_dependencies text[] := '{inventory_smart.store_stock_drilldown}';
	begin 		
		_query_pa := global.form_main_table_filters(
		  'product_attributes_filter',
		  $2
		);
		_query_sa := global.form_main_table_filters(
		  'store_attributes_filter',
		  $3
		);
		raise notice '%', _query_pa;
		raise notice '%', _query_sa;
		_query_combine := '
			WITH product_master_filters_data AS (
				SELECT
					region,
					dma_name,
					store_code as str_code,
					store_name,
					channel,
					asg.grade,
					l0_name,
					l1_name,
					l2_name,
					size,
					pmps.product_code as prod_code,
					paf.product_description,
					store_description
				FROM (select * FROM global.product_attributes_filter  ' || _query_pa || ') paf
				join global.product_mapping_product_store pmps
				using(product_code)
				join "global".product_mapping_store_dc pmsd using(store_code)
				join inventory_smart.article_store_grade asg using 	(article, store_code)	
				join (select region, dma_name, channel, store_code, store_name, store_description FROM global.store_attributes_filter ' || _query_sa || ') saf 
				    using(store_code)
				)
				--select * from product_master_filters_data
			,
			final_result AS (
			    select
					*,
					ssd.product_code as prd_code

				from inventory_smart.store_stock_drilldown ssd 
				join product_master_filters_data pmps on
				str_code = ssd.store_code and prod_code = ssd.product_code
			)
			select * from final_result';
		raise notice '%',_query_combine;
		_query_table_filters := global.form_table_query($4);
		select * from cache.wrap_sp(
				_cache_schema,
				_cache_sp,
				_cache_payload,
				_query_combine,
				_cache_dependencies,
				_cache_key_pattern) into _cache_table_id;
		perform set_config('myvars.cache_table_id', _cache_table_id, true);
		open $1 for execute 'select * from "cache"."' || _cache_table_id || '" X '|| _query_table_filters;
		RETURN $1;
	end
$function$
;
