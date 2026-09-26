--liquibase formatted sql
--changeset liquibase:reporting_update_future_receipt_target_wos runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for reporting_update_future_receipt_target_wos
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.reporting_update_future_receipt_target_wos(jsonb, jsonb, integer);
CREATE OR REPLACE FUNCTION inventory_smart.reporting_update_future_receipt_target_wos(jsonb, jsonb, integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
	declare
		_query_pa text := '';
		_query_sa text := '';
		_query_table_filters text := '';
		_query_combine text := '';
		_cache_payload jsonb := jsonb_build_object('product_attributes', $1, 'store_attributes', $2, 'target_wos', $3);
		_cache_table_id text;
		_cache_schema text := 'inventory_smart';
		_cache_sp text := '.reporting_future_receipt_sub_row_list_sub_row';
		_cache_key_pattern text := '{schema_name}:{sp_name}:{request}';
		_cache_dependencies text[] := '{inventory_smart.future_receipts}';
	begin 		
		_query_pa := global.form_main_table_filters(
		  'product_attributes_filter',
		  $1
		);
		_query_sa := global.form_main_table_filters(
		  'store_attributes_filter',
		  $2
		);
		_query_combine := '
			update inventory_smart.future_receipts aa 
			set target_wos='|| $3 ||' from (
			WITH product_master_filters_data AS (
				SELECT
					saf.store_code,
					channel,
					store_name,
					article,
					l0_name,
					l1_name,
					l2_name,
					style,
					style_description
				FROM (select * FROM global.product_attributes_filter  ' || _query_pa || ') paf
				join global.product_mapping_product_store pmps
				using(product_code)	
				join (select channel, store_code, store_name FROM global.store_attributes_filter ' || _query_sa || ') saf 
				    using(store_code)
				group by 1,2,3,4,5,6,7,8,9
				order by style
			)
			,
			future_receipts_data as (
				select
					fr.store_code,
					fr.article,
					week_number,
					target_wos
				from inventory_smart.future_receipts fr
				join product_master_filters_data pmps on
				pmps.store_code = fr.store_code and pmps.article = fr.article
			)
			select store_code, article, week_number from future_receipts_data ) a 
			where aa.store_code=a.store_code
			and aa.article=a.article
			and aa.week_number=a.week_number';
		raise notice '%',_query_combine;
		execute _query_combine;
	end
$function$
;
