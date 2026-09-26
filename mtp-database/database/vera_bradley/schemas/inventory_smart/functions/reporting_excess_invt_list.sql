--liquibase formatted sql
--changeset liquibase:reporting_excess_invt_list runOnChange:true stripComments:false splitStatements:false context:Release_1_1_2 labels:MTP-37199
--comment:MTP-37199
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.reporting_excess_invt_list(input refcursor, jsonb, jsonb, integer, integer, text, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.reporting_excess_invt_list(input refcursor, jsonb, jsonb, integer, integer, text, jsonb)
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
 		_cache_sp text := '.reporting_excess_invt_list';
 		_cache_key_pattern text := '{schema_name}:{sp_name}:{request}';
 		_cache_dependencies text[] := '{inventory_smart.excess_units}';
 		_client_columns text;
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
		_query_combine := '
			WITH product_master_filters_data AS (
			    SELECT 
					saf.store_code,
					store_name,
					product_description,
					article,
					fiscal_year,
					fiscal_week,
					
					asg.grade, 
 					saf.district, 
 					saf.state, 
 					saf.climate,
					saf.channel,
 					style,
 					style_description,
 					color_code,
 					color,
					
  					fabrication,
				
					paf.l0_name,
					l1_name,
					l2_name,
					l3_name,
					TO_CHAR(min(selldown_date), ''YYYY-MM-DD'') as selldown_date, 
					TO_CHAR(min(launch_date), ''YYYY-MM-DD'') as launch_date,
					TO_CHAR(min(clearance_end_date), ''YYYY-MM-DD'') as clearance_end_date,
					TO_CHAR(min(clearance_start_date), ''YYYY-MM-DD'') as clearance_start_date,
					TO_CHAR(min(retirement_date), ''YYYY-MM-DD'') as retirement_date,
					string_agg(distinct selling_collection, '', '') as selling_collection,
					sum(cm.min_stock) as min_stock,
					sum(cm.max_stock) as max_stock,

					max(oh) as oh,
					max(oo) as oo,
					max(it) as it,
					max(week_qty) as week_qty,
					max(eu.ros) as ros,
					max(target_wos) as target_wos,
					max(wos_pred) as wos_pred,
					max(excess_inv) as excess_inv,
					max(excess_inv_cost) as excess_inv_cost,
					max(tot_inv) as tot_inv
				FROM (select * FROM global.product_attributes_filter ' || _query_pa || ') paf
			    join (select * from inventory_smart.excess_units where fiscal_week = ' || _fiscal_week || ' and fiscal_year = ' || _fiscal_year || ') eu on eu.product_hierarchy  = paf.article
				left join inventory_smart.article_store_grade asg using(article, store_code)
				join (select * FROM global.store_attributes_filter ' || _query_sa || ') saf 
			    on saf.store_code = eu.store_code
				left join inventory_smart.constraint_master cm on (cm.product_code = paf.product_code and cm.store_code = saf.store_code)
				group by 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15 ,16,17,18,19,20
				
			)
--			select * from product_master_filters_data
			,inventory_stats as (
				SELECT 
					article,
					channel,
					coalesce(sum(week_to_date_sales), 0) as week_to_date_sales, 
					coalesce(sum(last_day_sales), 0) as last_day_sales,
					coalesce(sum(sales_1_ago), 0) as sales_1_ago, 
					coalesce(sum(sales_2_ago), 0) as sales_2_ago, 
					coalesce(sum(sales_3_ago), 0) as sales_3_ago, 
					coalesce(sum(sales_4_ago), 0) as sales_4_ago,  
					round( coalesce (avg(available_stores_percentage) * 100, 0)::decimal, 2) as available_stores_perc,
					round(coalesce(sum(lw_margin), 0)::decimal,2) as lw_margin,
					coalesce(sum(lw_qty), 0) as lw_qty,
                    coalesce(sum(lw_revenue), 0) as lw_revenue,
					round(coalesce((sum(lw_revenue) / nullif( sum(lw_qty), 0 )),0)::decimal,2) as price,
					round(coalesce(avg(promo_percentage),0)::decimal,2) as promo
					
				from
					inventory_smart.article_inventory_dashboard
				where  store_code not in (select name from global.distribution_centres)
				group by
					article, channel

			)
			,net_dc_available AS(
				select  article, channel, (coalesce(sum(sdau.oh),0)-(coalesce(sum(sdru.quantity),0)+coalesce(sum(sdau2.quantity),0))) as net_dc_available
				from 
						(select article, dc_code, channel , sum(oh) as oh from inventory_smart.sku_dc_available_units group by 1,2,3) sdau 
				left join (select article, dc_code, channel , sum(quantity) as quantity from inventory_smart.sku_dc_reserved_units group by 1,2,3) sdru 
						using(dc_code, article, channel)
				left join ( select article, dc_code, channel, sum(quantity) quantity from inventory_smart.sku_dc_allocated_units group by 1, 2, 3) sdau2
					   using(dc_code, article, channel)
				group by 1, 2
			)
			,
			final_result AS (
				select
					store_code,
					store_name,
					product_description,
					color_code,
					color,
					style,
					fiscal_year,
					fiscal_week,
					eu.article,
					grade, 
 					district, 
 					state, 
 					climate,
 					style_description,

					article_status_tag,
					ph.channel,

                    selling_collection,
					fabrication,
					
					l0_name,
					l1_name,
					l2_name,
					l3_name,
					selldown_date, 
					launch_date, 
					clearance_end_date,
					clearance_start_date,
					retirement_date,

					ii.week_to_date_sales,
	 				ii.last_day_sales,
					ii.sales_1_ago,
					ii.sales_2_ago,
					ii.sales_3_ago,
					ii.sales_4_ago,
					ii.lw_qty,
					nda.net_dc_available,

					min_stock,
					max_stock,
 					oh as total_oh,
 					oo as total_oo,
 					it as total_it,
 					week_qty as total_week_qty,
 					round(ros::numeric,2) as total_ros,
 					round(target_wos::numeric,2) as total_target_wos,
 					round(wos_pred::numeric,2) as total_wos_pred,
 					round(excess_inv::numeric,2) as total_execss_inv,
 					round(excess_inv_cost::numeric,2) as total_excess_inv_cost,
 					round(tot_inv::numeric,2) as sum_tot_inv
				from product_master_filters_data eu
				left join (select 
							article, channel,  string_agg(article_status_tag, '', '') as article_status_tag
							from inventory_smart.ph_master group by 1, 2) ph on ph.article = eu.article and ph.channel = eu.channel
				left join inventory_stats ii on ii.article = eu.article and ii.channel = eu.channel
				left join net_dc_available nda on nda.article = eu.article and nda.channel = ph.channel

				--group by 1,2,3,4,5,6,7,8,9,10,11,12,13,14 ,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30 ,31,32,33,34,35
			)
			select *, concat(article, ''_'', store_code) as key from final_result';
		raise notice '%', _query_combine;
		select
		  * 
		from 
		  cache.wrap_sp(
			_cache_schema, _cache_sp, _cache_payload, 
			_query_combine, _cache_dependencies, 
			_cache_key_pattern
		  ) into _cache_table_id;
		_query_table_filters := global.form_table_query($7);
		perform set_config(
		  'myvars.cache_table_id', _cache_table_id, 
		  true
		);
		open $1 for execute 'select * from "cache"."' || _cache_table_id || '" X ' || _query_table_filters;
--		open $1 for execute 'select * from inventory_smart.raise_notice order by t desc';
		RETURN $1;
	end
$function$
;