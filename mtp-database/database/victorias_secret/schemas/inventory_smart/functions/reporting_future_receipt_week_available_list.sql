--liquibase formatted sql
--changeset liquibase:reporting_future_receipt_week_available_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for reporting_future_receipt_week_available_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.reporting_future_receipt_week_available_list(input refcursor, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.reporting_future_receipt_week_available_list(input refcursor, jsonb, jsonb)
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
		_cache_sp text := '.reporting_future_receipt_week_available_list';
		_cache_key_pattern text := '{schema_name}:{sp_name}:{request}';
		_cache_dependencies text[] := '{inventory_smart.future_receipts}';
		v_gen_random_uuid text  := gen_random_uuid()::varchar;
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
					store_code
				FROM (select * FROM global.product_attributes_filter  ' || _query_pa || ') paf
				join global.product_mapping_product_store pmps
				using(product_code)	
				join (select channel, store_code, store_name FROM global.store_attributes_filter ' || _query_sa || ') saf 
				    using(store_code)
				)
				--select * from product_master_filters_data
			,
			future_receipts_week_available_data as (
				select
					distinct week_number
				from inventory_smart.future_receipts_calculate_data fr
				join product_master_filters_data pmps on
				pmps.store_code = fr.store_code
				order by week_number
			)
			select * from future_receipts_week_available_data';
		raise notice '%',_query_combine;
		select * from cache.wrap_sp(
				_cache_schema,
				_cache_sp,
				_cache_payload,
				_query_combine,
				_cache_dependencies,
				_cache_key_pattern) into _cache_table_id;
		perform set_config('myvars.cache_table_id', _cache_table_id, true);
		open $1 for execute 'select * from "cache"."' || _cache_table_id || '" X ';
		perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.reporting_future_receipt_week_available_list', 'Before Return',_query_combine,jsonb_build_object('product_attributes', $2, 'store_attributes', $3));
		perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.reporting_future_receipt_week_available_list', 'Before Return','select * from "cache"."' || _cache_table_id || '" X ',jsonb_build_object('product_attributes', $2, 'store_attributes', $3));		
		RETURN $1;
	end
$function$
;
