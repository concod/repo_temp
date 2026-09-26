--liquibase formatted sql
--changeset liquibase:reporting_store_stock_drill_down_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0_3 labels:MTP-24086, MTP-24087
--rollback: MTP-24086, MTP-24087
DROP FUNCTION IF EXISTS inventory_smart.reporting_store_stock_drill_down_list(input refcursor, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.reporting_store_stock_drill_down_list(input refcursor, jsonb, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 /*
 * 
  Store Stock Drill Down SP
  -------------------
  Inputs :- 
  -------
  $1 - Refcursor
  $2 - Product attributes 
  $3 - store attribute filters - includes channel (COMPULSORY)
  $4 - table search sort
  ----------
  SP Call :-
  --------
	begin;
	select
		*
	from
		inventory_smart.reporting_store_stock_drill_down_list('my_cur',
		'{"l0_name": [{"type": "list", "operator": "in", "values": ["Bags"]}], "l1_name": [{"type": "list", "operator": "in", "values": ["Baby Bags"]}], "color": [{"type": "list", "operator": "not in", "values": ["2ND"]}]}',
		'{"channel": [{"type": "list", "operator": "in", "values": ["Factory Line Retail"]}, {"type": "list", "operator": "not in", "values": ["Ecom", "Wholesale", "Online_Outlet", "Web", "Specialty", "Amazon", "Key_Account"]}], "store_code": [{"type": "list", "operator": "in", "values": ["4002"]}] }',
		'{"search": [], "sort": [{"column": "article", "order": "asc"}, {"column": "store_code", "order": "asc"}, {"column": "grade", "order": "asc"}], "range": [], "limit": {"limit": 100, "page": 1, "offset": 0, "sub_offset": 0}}');
	fetch all in "my_cur";
	commit;

--------
  Docs :-
  -------
  Currently no cache is used
 * 
 */
 	declare
 		_query_pa text := '';
 		_query_sa text := '';
 		_channel text := inventory_smart.get_channel_from_input($3);
 		_query_table_filters text := '';
 		_query_combine text := '';
 		_cache_payload jsonb := jsonb_build_object('product_attributes', $2, 'store_attributes', $3);
 		_cache_table_id text;
 		_cache_schema text := 'inventory_smart';
 		_cache_sp text := '.reporting_store_stock_drill_down_list';
 		_cache_key_pattern text := '{schema_name}:{sp_name}:{request}';
 		_cache_dependencies text[] := '{inventory_smart.store_stock_drilldown}';
 		
	 	_filter_query text := '';
	 	_sort_query text;
	 	_overall_search TEXT:= '';
	 	_limit text := '';
		_offset text := '';
	 	_sub_limit text := '';
	 	_sub_offset text := '';
	 	_limit_query text := '';
	

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
 		_query_table_filters := global.form_table_query($4);
 	raise notice ' _query_table_filters   %', _query_table_filters;
 		
 		_query_combine := '
 				
		with base as (
		-- for sub query pagination we need article store combos
		select *
				
	from (select
			paf.article,
			ssd.store_code,
			saf.store_name,
			ssd.channel,
			asg.grade,
			paf.style_description,
			paf.color,
			paf.l0_name,
			paf.l1_name,
			paf.l2_name,
			paf.style,
			paf.color_code,
	        paf.l3_name,
			paf.launch_date,
            paf.selling_collection,
            paf.fabrication,
            paf.clearance_start_date,
            paf.clearance_end_date,
            paf.retirement_date,
            paf.selldown_date,
            ph.article_status_tag,
       
			ssd.style_color_status,
			ssd.store_status,
			 saf.district,
			 saf.state,
			 saf.climate,

			sum(coalesce(cm.min_stock, 0)) min_stock,
			sum(coalesce(cm.max_stock, 0)) max_stock,
			avg(coalesce(wos_predicted,0)) as wos_predicted,	
			sum(coalesce(store_avail_oh, 0)) oh,
			sum(coalesce(store_in_transit,0)) as it,
			sum(coalesce(oo,0)) as oo,
			sum(coalesce(tot_inv,0)) as tot_inv,
			avg(coalesce(size_integrity,0)) as size_integrity,
			sum(coalesce(lw_qty,0)) as lw_qty,
			sum(coalesce(lw_margin,0)) as lw_margin,
			sum(coalesce(week_to_date_sales,0)) as week_to_date_sales,
			sum(coalesce(last_day_sales,0)) as last_day_sales,
			sum(coalesce(sales_1_ago,0)) as sales_1_ago,
			sum(coalesce(sales_2_ago,0)) as sales_2_ago,
			sum(coalesce(sales_3_ago,0)) as sales_3_ago,
			sum(coalesce(sales_4_ago,0)) as sales_4_ago
		
		from 
				inventory_smart.store_stock_drilldown ssd
 				join (select * FROM global.product_attributes_filter  ' || _query_pa || ') paf
 					using (product_code, article)
 				join (select channel, store_code, store_name
	
						, district, state, climate

						 FROM global.store_attributes_filter ' || _query_sa || '
						) saf 
 					using(store_code, channel)
				left join inventory_smart.article_store_grade asg 
					using(article, store_code)
				
				left join (
  					      select 
  					        article,
							channel,
							article_status_tag
  						--	unnest(product_code_size_map) as product
  					      FROM 
  					        inventory_smart.ph_master
  					    ) ph
				on ph.article = paf.article and ph.channel = saf.channel
				join inventory_smart.constraint_master cm on (cm.product_code = paf.product_code and cm.store_code = saf.store_code)
				group by 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12  ,13,14,15 ,16,17, 18,19, 20, 21, 22, 23,24,25,26
				) x 	'|| _query_table_filters ||'
			)
			--select * from base;

			,dc_data as (
			-- get dc data for these articles which are paginated
			-- store info is not required
			-- article - DC level
				select 
					ssd2.article,
				    dc.dc_code,
					dc.name as dc_name,
					dc.linked_store_code as dc_store_code,
					(coalesce(sdau.oh,0)-(coalesce(sdru.quantity,0)+coalesce(sdau2.quantity,0))) as net_dc_available,
					sum(coalesce(store_avail_oh,0)) as oh_dc,
					sum(coalesce(it_dc,0)) as it_dc,
					sum(coalesce(oo_dc,0)) as oo_dc,
					sum(coalesce(dc_oh_1,0)) as dc_oh_1,
					sum(coalesce(dc_oh_qcloc,0)) as dc_oh_qcloc,
					sum(coalesce(dc_oh_cwc,0)) as dc_oh_cwc,
					sum(coalesce(dc_oh_10,0)) as dc_oh_10,
					sum(coalesce(available_to_allocate,0)) as available_to_allocate
			--					coalesce(sdau.oh,0) as dc_avaliable_units,
			--					coalesce(sdru.quantity,0) as reserve_quantity,
			--					coalesce(sdau2.quantity,0) as allocated_units
				
				from inventory_smart.store_stock_drilldown ssd2 
				--join base using (article, channel) -- not required since we do article in -where
				join "global".distribution_centres dc on dc.linked_store_code  = ssd2.store_code
				left join (select article, dc_code, channel , sum(oh) as oh from inventory_smart.sku_dc_available_units group by 1,2,3) sdau 
					using(dc_code, article, channel)
				left join (select article, dc_code, channel , sum(quantity) as quantity from inventory_smart.sku_dc_reserved_units group by 1,2,3) sdru 
					using(dc_code, article, channel)
				left join (
				select
					article,
					dc_code,
					channel,
					sum(quantity) quantity
				from
					inventory_smart.sku_dc_allocated_units
				group by
					1,
					2,
					3) sdau2
					using(dc_code, article, channel)
				where article in (select distinct article from base) 
					and ssd2.channel =  ''' || _channel || '''	
				group by 1,2,3,4,5
				)
			--select * from dc_data;

			--, final_article_store_level as ( 
			select 
				b.*, 
				dd.*, 
				
				concat(article,''-'',store_code,''-'',grade) as key
			from BASE b 
			join dc_data dd using(article)
			

		--	)
 			';
 		raise notice '%',_query_combine;
 		
--		raise notice '%dddddddd',_query_table_filters;
-- 		select * from cache.wrap_sp(
-- 				_cache_schema,
-- 				_cache_sp,
-- 				_cache_payload,
-- 				_query_combine,
-- 				_cache_dependencies,
-- 				_cache_key_pattern) into _cache_table_id;
-- 		perform set_config('myvars.cache_table_id', _cache_table_id, true);
-- 		open $1 for execute 'select * from "cache"."' || _cache_table_id || '" X ' || _query_table_filters;
 		open $1 for execute _query_combine;
 		RETURN $1;
 	end
 $function$
;