--liquibase formatted sql
--changeset liquibase:reporting_lost_sales_fiscal_graph runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for reporting_lost_sales_fiscal_graph
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.reporting_lost_sales_fiscal_graph(input refcursor, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.reporting_lost_sales_fiscal_graph(input refcursor, jsonb, jsonb)
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
		_cache_sp text := '.reporting_lost_sales_fiscal_graph';
		_cache_key_pattern text := '{schema_name}:{sp_name}:{request}';
		_cache_dependencies text[] := '{inventory_smart.loss_units}';
	begin 		
		_query_pa := global.form_main_table_filters(
		  'product_attributes_filter',
		  $2
		);
		_query_sa := global.form_main_table_filters(
		  'store_attributes_filter',
		  $3
		);
		_query_combine := '
			WITH product_master_filters_data AS (
			    SELECT 
					store_code,
					article
				FROM (select product_code, article FROM global.product_attributes_filter ' || _query_pa || ') paf
			    join global.product_mapping_product_store pmps
			    using(product_code)
			    join (select store_code FROM global.store_attributes_filter ' || _query_sa || ') saf 
			    using(store_code)
			)
--			select * from product_master_filters_data
			,
			loss_units AS (
				select
					fiscal_week,
					fiscal_year,
					date as loss_date,
					lost_sales,
					lost_units
				from inventory_smart.loss_units lu 
				join product_master_filters_data pmps on
				pmps.store_code = lu.store_code and pmps.article = lu.product_hierarchy
			)
			--select * from loss_units
			,
			final_result AS (
				select
					fiscal_week,
					fiscal_year,
					sum(lost_units) as lost_units,
					sum(lost_sales) as lost_sales
				from loss_units lu
				group by fiscal_week, fiscal_year
				order by fiscal_year desc, fiscal_week desc
			)
			select * from final_result';
		raise notice '%', _query_combine;
		select
		  * 
		from 
		  cache.wrap_sp(
			_cache_schema, _cache_sp, _cache_payload, 
			_query_combine, _cache_dependencies, 
			_cache_key_pattern
		  ) into _cache_table_id;
--		_query_table_filters := global.form_table_query($6);
		perform set_config(
		  'myvars.cache_table_id', _cache_table_id, 
		  true
		);
		open $1 for execute 'select * from "cache"."' || _cache_table_id || '" X ' || _query_table_filters;
		RETURN $1;
	end
$function$
;
