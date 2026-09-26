--liquibase formatted sql
--changeset kirubasahari.n@imapctanalytics.co:Add_col_for_consolidated_report  MTP-64142 runOnChange:true stripComments:false splitStatements:false context:Ralph_Lauren_InventorySmart labels:MTP-64142
--comment: Adding dc instock pct MTP-64142
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_article_inventory_dashboard(IN _is_historic boolean);
CREATE OR REPLACE PROCEDURE public.sync_article_inventory_dashboard(IN _is_historic boolean DEFAULT true)
 LANGUAGE plpgsql
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
 			lw_revenue,
 			lw_margin,
 			oh,
 			oo,
 			it,
 			store_level_prediction,
 			oh_dc,
 			shortfall,
 			normal,
 			excess,
 			wos,
 			lw_qty,
 			promo_percentage,
 			stockout,
 			tot_inv,
 			si,
 			available_stores_percentage,
 			week_to_date_sales,
 			last_day_sales,
 			top_25_percent,
 			oo_dc,
 			it_dc,
 			channel,
 			lw_margin_percentage,
 			sales_1_ago,
 			sales_2_ago,
 			sales_3_ago,
 			sales_4_ago,
 			sales_5_ago,
 			sales_6_ago,
 			sales_7_ago,
 			sales_8_ago,
            aur,
            sales_pen_pct,
            sales_build,
            sell_through_rate,
            inv_pen_pct,
            stock_to_sales_ratio,
            weeks_oh,
            inv_build,
            style_color_status,
			floorset_date,
			instock_pct,
			instock_pct_details,
			min_constraints,
			max_constraints,
			capped_demand,
			estimated_demand,
			twos,
			financial_zone, 
            dc_instock_pct,
            dc_oh_packs,
            total_inventory
 		) 
 		SELECT 
 		   article,
 			store_code,
 			lw_revenue,
 			lw_margin,
 			oh,
 			oo,
 			it,
 			store_level_prediction,
 			oh_dc,
 			shortfall,
 			normal,
 			excess,
 			wos,
 			lw_units,
 			promo_percentage,
 			stockout,
 			tot_inv,
 			size_integrity,
 			available_stores_percentage,
 			week_to_date_sales,
 			last_day_sales,
 			top_25_percent,
 			oo_dc,
 			it_dc,
 			channel,
 			lw_gm_perc,
 			sales_1_ago,
 			sales_2_ago,
 			sales_3_ago,
 			sales_4_ago,
 			sales_5_ago,
 			sales_6_ago,
 			sales_7_ago,
 			sales_8_ago,
            aur,
            sales_pen_pct,
            sales_build,
            sell_through_rate,
            inv_pen_pct,
            stock_to_sales_ratio,
            weeks_oh,
            inv_build,
            style_color_status,
			floorset_date,
			instock_pct,
			instock_pct_details,
			min_constraints,
			max_constraints,
			capped_demand,
			estimated_demand,
			twos,
			financial_zone, 
            dc_instock_pct,
            dc_oh_packs,
            total_inventory
 		FROM 
 		  public.article_inventory_dashboard {where} RETURNING 1
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
$procedure$
;