--liquibase formatted sql
--changeset liquibase:reporting_lost_sales_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0_5 labels:MTP-22588
--comment: bugfix: - optimised query
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.reporting_lost_sales_list(input refcursor, jsonb, jsonb, integer, integer, text);
CREATE OR REPLACE FUNCTION inventory_smart.reporting_lost_sales_list(input refcursor, jsonb, jsonb, integer, integer, text, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
	declare
		_query_pa text := '';
		_query_sa text := '';
		_fiscal_week text := $4;
		_fiscal_year text := $5;
		_query_table_filters text := '';
		_query_combine text := '';
		_cache_payload jsonb := jsonb_build_object('product_attributes', $2, 'store_attributes', $3, 'fiscal_week', $4, 'fiscal_year', $5, 'client_columns', $6);
		_cache_table_id text;
		_cache_schema text := 'inventory_smart';
		_cache_sp text := '.reporting_lost_sales_list';
		_cache_key_pattern text := '{schema_name}:{sp_name}:{request}';
		_cache_dependencies text[] := '{inventory_smart.loss_units}';
		_client_columns text;
		_table_query text := '';
	begin 		
		_query_pa := global.form_main_table_filters(
		  'product_attributes_filter',
		  $2
		);
		_query_sa := global.form_main_table_filters(
		  'store_attributes_filter',
		  $3
		);
		if length ($6)> 0 then
			_client_columns := ','||$6;
		else 
			_client_columns := '';
		end if;
		_table_query := global.form_table_query($7);
		_query_combine := '
			
			
			with loss_units AS (
				select
					lu.store_code,
					retail_facility_code,
					fiscal_year,
					fiscal_week,
					opening_inventory as week_open_balance,
					article,
					date as loss_date,
					quantity,
					cluster_avg_sales,
					lost_units,
					line_amount,
					product_description,
					color,
					style_color_id,
					lost_sales,
					coalesce(wos_pred,0) as wos_pred,
					coalesce(opening_inventory,0) as oh,
					sum(COALESCE(opening_inventory, 0) + COALESCE(oo, 0) + COALESCE(it, 0)) AS oh_oo_it
					' || _client_columns || '
				from (select * from inventory_smart.loss_units lu where fiscal_week = ' || _fiscal_week || ' and fiscal_year = ' || _fiscal_year || ') lu
				--join product_master_filters_data pmps on
				--pmps.store_code = lu.store_code and 
				join (select distinct style_color_id, product_description, color,article FROM global.product_attributes_filter ' || _query_pa || ') paf on paf.article = lu.product_hierarchy
				join (select store_code, retail_facility_code FROM global.store_attributes_filter ' || _query_sa || ') saf 
			    using(store_code)
				group by 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17
			)
			--select * from loss_units
			,
			final_result AS (
				select
					article,
					lu.store_code,
					retail_facility_code,
					fiscal_year,
					fiscal_week,
					product_description,
					color,
					style_color_id,
					wos_pred,
					oh,
					oh_oo_it
					' || _client_columns || ',
					sum(week_open_balance) as week_open_balance,
					sum(quantity) as total_quantity,
					avg(cluster_avg_sales) as cluster_avg_sales,
					sum(lost_units) as lost_units,
					sum(line_amount) as line_amount,
					sum(lost_sales) as lost_sales	
				from loss_units lu
				--where fiscal_week = ' || _fiscal_week || ' and fiscal_year = ' || _fiscal_year || '
				group by article, store_code, fiscal_year, fiscal_week, product_description, color, style_color_id, wos_pred, oh, oh_oo_it, retail_facility_code' || _client_columns || '
			)
			select *, concat(article, ''_'', store_code) as key from final_result' ;
		raise notice '%', _query_combine;
		select
		  * 
		from 
		  cache.wrap_sp(
			_cache_schema, _cache_sp, _cache_payload, 
			_query_combine, _cache_dependencies, 
			_cache_key_pattern
		  ) into _cache_table_id;
		perform set_config(
		  'myvars.cache_table_id', _cache_table_id, 
		  true
		);
		open $1 for execute 'select * from "cache"."' || _cache_table_id || '" X '||_table_query||'';
		RETURN $1;
	end
$function$
;