--liquibase formatted sql
--changeset liquibase:reporting_lost_sales_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0_8 labels:MTP-37199
--comment: MTP-37199
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.reporting_lost_sales_list(input refcursor, jsonb, jsonb, integer, integer, text, jsonb);
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
 		_channel text[] := inventory_smart.get_channel_from_input_new($3);
 		_cache_payload jsonb := jsonb_build_object('product_attributes', $2, 'store_attributes', $3, 'fiscal_week', $4, 'fiscal_year', $5, 'client_columns', $6);
 		_cache_table_id text;
 		_cache_schema text := 'inventory_smart';
 		_cache_sp text := '.reporting_lost_sales_list';
 		_cache_key_pattern text := '{schema_name}:{sp_name}:{request}';
 		_cache_dependencies text[] := '{inventory_smart.loss_units}';
 		_client_columns text;
 		channel_updated text := '';
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
 	
 		select 'any('''|| concat(_channel) ||'''::varchar[])' into channel_updated;
 		_query_table_filters = global.form_table_query($7);
 		raise notice 'table filter %', _query_table_filters;
 		_query_combine := '
 			WITH product_master_filters_data AS (
 			    SELECT 
 					saf.store_code,
					store_name,
					product_description,
					article,
					fiscal_week,
					fiscal_year,
					asg.grade,
					district, 
					state,
					climate,
 					style,
					style_description,
					color_code,
					color,
					paf.l0_name,
					paf.l1_name,
				    paf.l2_name,
				    paf.l3_name,
				    paf.launch_date,
				    paf.selling_collection,
				    paf.fabrication,
					TO_CHAR(paf.clearance_start_date, ''YYYY-MM-DD'') as clearance_start_date,
					TO_CHAR(paf.clearance_end_date, ''YYYY-MM-DD'') as clearance_end_date,
					TO_CHAR(paf.retirement_date, ''YYYY-MM-DD'') as retirement_date,
					TO_CHAR(paf.selldown_date, ''YYYY-MM-DD'') as selldown_date,
					saf.channel,

					sum(cm.min_stock) as min_stock,
					sum(cm.max_stock) as max_stock,
					max(opening_inventory) as opening_inventory,
					max(quantity) as quantity,
					max(cluster_avg_sales) as cluster_avg_sales,
					max(lost_units) as lost_units,
					max(line_amount) as line_amount,
					max(lost_sales) as lost_sales
 				FROM (select * FROM global.product_attributes_filter ' || _query_pa || ') paf
 			    join inventory_smart.loss_units lu on lu.product_hierarchy = paf.article
				left join inventory_smart.article_store_grade asg using(article, store_code)
 			    join (select * FROM global.store_attributes_filter ' || _query_sa || ') saf 
 			    on saf.store_code = lu.store_code
				left join inventory_smart.constraint_master cm on (cm.product_code = paf.product_code and cm.store_code = saf.store_code)
				
				group by 1,2,3,4,5,6,7,8 ,9,10,11,12,13,14 ,15,16,17,18,19,20,21,22,23,24,25,26 
 			)
 --			select * from product_master_filters_data
			,inventory_stats as (
				SELECT 
					article,
					coalesce(sum(week_to_date_sales), 0) as week_to_date_sales, 
					coalesce(sum(last_day_sales), 0) as last_day_sales,
					coalesce(sum(sales_1_ago), 0) as sales_1_ago, 
					coalesce(sum(sales_2_ago), 0) as sales_2_ago, 
					coalesce(sum(sales_3_ago), 0) as sales_3_ago, 
					coalesce(sum(sales_4_ago), 0) as sales_4_ago,  
					coalesce(sum(lw_qty), 0) as lw_qty,
					max(oh) as oh,
					max(oo) as oo,
					max(it) as it	
				from
					inventory_smart.article_inventory_dashboard
				where  store_code not in (select name from global.distribution_centres)
				group by
					article

			)
			,net_dc_available AS(
				select  article, channel,  (coalesce(sdau.oh,0)-(coalesce(sdru.quantity,0)+coalesce(sdau2.quantity,0))) as net_dc_available
				from 
						(select article, dc_code, channel , sum(oh) as oh from inventory_smart.sku_dc_available_units group by 1,2,3) sdau 
				left join (select article, dc_code, channel , sum(quantity) as quantity from inventory_smart.sku_dc_reserved_units group by 1,2,3) sdru 
						using(dc_code, article, channel)
				left join ( select article, dc_code, channel, sum(quantity) quantity from inventory_smart.sku_dc_allocated_units group by 1, 2, 3) sdau2
					   using(dc_code, article, channel)
			)
 			,
 			loss_units AS (
 				select
					store_code,
					store_name,
					product_description,
					lu.article,
					fiscal_week,
					fiscal_year,
					grade,
					district, 
					state, 
					climate,
					style,
 					style_description,
 					color_code,
 					color,

					article_status_tag,
					lu.channel,
					min_stock,
					max_stock,

					l0_name,
					l1_name,
				    l2_name,
				    l3_name,
				    launch_date,
				    selling_collection,
				    fabrication,
				    clearance_start_date,
				    clearance_end_date,
				    retirement_date,
				    
				    selldown_date,

					ii.week_to_date_sales,
	 				ii.last_day_sales,
					ii.sales_1_ago,
					ii.sales_2_ago,
					ii.sales_3_ago,
					ii.sales_4_ago,
					ii.lw_qty,
					ii.oh,
					ii.oo,
					ii.it,
					nda.net_dc_available,
					
					ROUND(coalesce(sum(opening_inventory),0)::numeric,2) as week_open_balance,
					coalesce(sum(quantity),0) as total_quantity,
					ROUND(coalesce(avg(cluster_avg_sales),0)::numeric,2) as cluster_avg_sales,
					coalesce(sum(lost_units),0) as lost_units,
					ROUND(coalesce(sum(line_amount),0)::numeric,2) as line_amount,
					ROUND(coalesce(sum(lost_sales),0)::numeric,2) as lost_sales
 				from product_master_filters_data lu
				left join (select article, string_agg(distinct article_status_tag, '', '') as article_status_tag
							from inventory_smart.ph_master where channel = '||channel_updated||' group by 1) ph on ph.article = lu.article
				left join inventory_stats ii on ii.article = lu.article
				 left join net_dc_available nda on nda.article =lu.article  and nda.channel = lu.channel

				where fiscal_week = ' || _fiscal_week || ' and fiscal_year = ' || _fiscal_year || '
				group by 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40
 			)
 			--select * from loss_units
 			select *, concat(article, ''_'', store_code) as key from loss_units';
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
 		open $1 for execute 'select * from "cache"."' || _cache_table_id || '" X ' || _query_table_filters;
-- open $1 for execute _query_combine;
 RETURN $1;
 end
 $function$
;