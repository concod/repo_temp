-- liquibase formatted sql
-- changeset sreevathsa.sp@impactanalytics.co:sync_article_inventory_dashboard_v10 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:pacsun_sync_article_inventory_dashboard
-- comment: initial changeset for sync_article_inventory_dashboard

DROP PROCEDURE if exists public.sync_article_inventory_dashboard();

CREATE OR REPLACE PROCEDURE public.sync_article_inventory_dashboard(IN _is_historic boolean DEFAULT true)
 LANGUAGE plpgsql
--  SECURITY DEFINER
AS $procedure$
declare
		_worker text;
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_article_inventory_dashboard';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
 	begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
 		if _is_historic then 
	 		select async_query into _worker from public.async_query('delete from 
	 		  inventory_smart.article_inventory_dashboard 
	 		where 
	 		  true;');
			perform public.async_query_status(_worker, 'cleanup');
			raise notice 'Step1: %', (clock_timestamp() - _st);
 			-- perform global.create_drop_index_list_ingestion('inventory_smart', 'article_inventory_dashboard', true);
 			-- raise notice 'Step2: %', (clock_timestamp() - _st);
 		end if;
 		perform public.parellel_insert('WITH rows AS ( insert into inventory_smart.article_inventory_dashboard (
 		        article,
            store_code,
            channel,
            channel_name,
            product_description,
            oh,
            it,
            oo,
            tot_inv,
            lw_units,
            lw_revenue,
            lw_margin,
            lw_discount_amount,
            promo_percentage,
            wos_oh,
            store_level_prediction,
            size_integrity,
            total_count,
            in_stock_count,
            overstock,
            normal,
            shortfall,
            stockout,
            available_stores_percentage,
            week_to_date_sales,
            last_day_sales,
            oh_dc,
            oo_dc,
            dc_oo_po,
            it_dc,
            sales_1_ago,
            sales_2_ago,
            sales_3_ago,
            sales_4_ago,
            sales_5_ago,
            sales_6_ago,
            sales_7_ago,
            sales_8_ago,
            L4W_sales,
            L8W_sales,
            aur,
            sell_through_rate,
            style_color_status,
            dc_available,
            dc_oo_30_days,
            in_stock_percentage,
            first_sale_date,
            last_receipt_date,
            lw_store_units,
            lw_sfs_units,
            lw_price,
            lw_aur,
            lw_aps,
            it_allocated,
            it_shipped,
            it_store_to_store,
            fwos,
            wos_oh_it,
            hybrid_wos,
            hybrid_wos_oh_it,
            upas,
            forecast_this_wk,
            forecast_next_wk,
            forecast_4_next_wk,
            forecast_8_next_wk,
            no_of_stores_oh,
            store_tier,
            store_name,
            style,
            color_name,
            l0_name,
            l1_name,
            l2_name,
            l3_id_name,
            brand,
            markdown_ind,
            ladder,
			s0_name,
			s1_id_name,
			s2_id_name,
			s3_id_name,
			s4_name,
			state_name,
			country_name,
			store_code_name,
      l4_id,
      twos
 		) 
 		SELECT distinct
 		        aid.article,
            aid.store_code,
            aid.channel,
            aid.channel_name,
            pd.style_color_description as product_description,
            aid.oh,
            aid.it,
            aid.oo,
            aid.tot_inv,
            aid.lw_units,
            aid.lw_revenue,
            aid.lw_margin,
            aid.lw_discount_amount,
            aid.promo_percentage,
            aid.wos_oh,
            aid.store_level_prediction,
            aid.size_integrity,
            aid.total_count,
            aid.in_stock_count,
            aid.overstock,
            aid.normal,
            aid.shortfall,
            aid.stockout,
            aid.available_stores_percentage,
            aid.week_to_date_sales,
            aid.last_day_sales,
            aid.oh_dc,
            aid.oo_dc,
            aid.dc_oo_po,
            aid.it_dc,
            aid.sales_1_ago,
            aid.sales_2_ago,
            aid.sales_3_ago,
            aid.sales_4_ago,
            aid.sales_5_ago,
            aid.sales_6_ago,
            aid.sales_7_ago,
            aid.sales_8_ago,
            (coalesce(aid.sales_1_ago,0)+coalesce(aid.sales_2_ago,0)+coalesce(aid.sales_3_ago,0)+coalesce(aid.sales_4_ago,0)) as L4W_sales,
            (coalesce(aid.sales_1_ago,0)+coalesce(aid.sales_2_ago,0)+coalesce(aid.sales_3_ago,0)+coalesce(aid.sales_4_ago,0)+coalesce(aid.sales_5_ago,0)+coalesce(aid.sales_6_ago,0)+coalesce(aid.sales_7_ago,0)+coalesce(aid.sales_8_ago,0)) as L8W_sales,
            aid.lw_aur as aur,
            aid.sell_through_rate,
            aid.style_color_status,
            aid.dc_available,
            aid.dc_oo_30_days,
            aid.in_stock_percentage,
            aid.first_sale_date,
            aid.last_receipt_date,
            aid.lw_store_units,
            aid.lw_sfs_units,
            aid.lw_price,
            aid.lw_aur,
            aid.lw_aps,
            aid.it_allocated,
            aid.it_shipped,
            aid.it_store_to_store,
            aid.fwos,
            aid.wos_oh_it,
            aid.hybrid_wos,
            aid.hybrid_wos_oh_it,
            aid.upas,
            aid.forecast_this_wk,
            aid.forecast_next_wk,
            aid.forecast_4_next_wk,
            aid.forecast_8_next_wk,
            aid.no_of_stores_oh,
            aid.store_tier,
            aid.store_name,
            pd.style,
            pd.color_name,
            paf.l0_name,
            paf.l1_name,
            paf.l2_name,
            aid.l3_id_name,
            paf.brand,
            paf.markdown_ind,
            paf.ladder,
			saf.s0_name,
			saf.s1_id_name,
			saf.s2_id_name,
			saf.s3_id_name,
			saf.s4_name,
			saf.state_name,
			saf.country_name,
			saf.store_code_name,
      paf.l4_id,
      aid.twos
 		FROM 
 		  public.article_inventory_dashboard aid
      LEFT JOIN global.product_attributes_filter paf ON aid.article = paf.article
	  LEFT JOIN global.store_attributes_filter saf using(store_code)
    left join (select article,max(style_color_description) style_color_description,max(style) as style,max(color_name) as color_name from global.product_attributes_filter group by 1) pd on paf.article = pd.article
      {where} RETURNING 1
		)
		SELECT 
		  count(1) as cnt 
		FROM 
		  rows;', 50, 'public.article_inventory_dashboard', 'store_code', 'paid_store_idx');
		raise notice 'Step2: %', (clock_timestamp() - _st);
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
 	end
$procedure$;