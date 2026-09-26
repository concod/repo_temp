--liquibase formatted sql
--changeset liquibase:reporting_future_receipt_sub_row_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for reporting_future_receipt_sub_row_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.reporting_future_receipt_sub_row_list(input refcursor, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.reporting_future_receipt_sub_row_list(input refcursor, jsonb, jsonb)
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
		_cache_sp text := '.reporting_future_receipt_sub_row_list';
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
		_query_combine := '
			WITH product_master_filters_data AS (
				SELECT
					channel,
					saf.store_code,
					article,
					l2_name,
					style,
					style_description
				FROM (select * FROM global.product_attributes_filter  ' || _query_pa || ') paf
				join global.product_mapping_product_store pmps
				using(product_code)	
				join (select channel, store_code, store_name FROM global.store_attributes_filter ' || _query_sa || ') saf 
				    using(store_code)
				group by 1,2,3,4,5,6
			)
			,
			future_receipts_data as (
				select
					channel,
					fr.store_code,
					l2_name,
					style,
					style_description,
					week_number,
					sum(scheduled_receipts_units) as scheduled_receipts_units,
					sum(oh) as oh_inventory,
					avg(forecast_for_next_6_weeks) as forecast_for_next_6_weeks,
					avg(target_wos) as target_wos,
					sum(current_ros) as current_ros
		--				from inventory_smart.future_receipts_calculate_data fr
				from inventory_smart.future_receipts fr
				join product_master_filters_data pmps on
				pmps.store_code = fr.store_code and pmps.article = fr.article
				group by 1,2,3,4,5,6
			)
			select *, concat(store_code, ''_'', l2_name, ''_'',style) as key from future_receipts_data';
		raise notice '%',_query_combine;
--		raise notice '%ddddd', _query_table_filters;
--		_query_table_filters := global.form_table_query($4);
		select * from cache.wrap_sp(
				_cache_schema,
				_cache_sp,
				_cache_payload,
				_query_combine,
				_cache_dependencies,
				_cache_key_pattern) into _cache_table_id;
		perform set_config('myvars.cache_table_id', _cache_table_id, true);
		open $1 for execute 'select * from "cache"."' || _cache_table_id || '" X '; -- || _query_table_filters;
		perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.reporting_future_receipt_sub_row_list', 'Before Return',_query_combine,jsonb_build_object('product_attributes', $2, 'store_attributes', $3));	
		 perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.reporting_future_receipt_sub_row_list', 'Before Return','select * from "cache"."' || _cache_table_id || '" X ',jsonb_build_object('product_attributes', $2, 'store_attributes', $3));
		RETURN $1;
	end
$function$
;
