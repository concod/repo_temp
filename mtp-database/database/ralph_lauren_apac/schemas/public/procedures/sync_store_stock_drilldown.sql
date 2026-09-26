--liquibase formatted sql
--changeset kiruba@impactanalytics.co:sync_store_stock_drilldown_1 runOnChange:true stripComments:false splitStatements:false context:ASync_Procedures_1 labels:MTP-64124
--comment: changeset FOR sync_store_stock_drilldown
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_store_stock_drilldown(IN _is_historic boolean);
CREATE OR REPLACE PROCEDURE public.sync_store_stock_drilldown(IN _is_historic boolean DEFAULT true)
 LANGUAGE plpgsql
AS $procedure$
declare
		_worker text;
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_store_stock_drilldown';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
 	begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	 	if _is_historic then 
	 		select async_query into _worker from public.async_query('delete from inventory_smart.store_stock_drilldown where true;');
	 		perform public.async_query_status(_worker, 'cleanup');
	 		raise notice 'Step1: %', (clock_timestamp() - _st);
	 		-- perform global.create_drop_index_list_ingestion('inventory_smart', 'store_stock_drilldown', true);
	 		-- raise notice 'Step2: %', (clock_timestamp() - _st);
 		end if;
 		perform public.parellel_insert('WITH rows AS (
			INSERT INTO inventory_smart.store_stock_drilldown (
			  article, product_code, store_code, 
			  date, channel, store_avail_oh, store_in_transit, 
			  oh_dc, oo, tot_inv, lw_qty, lw_revenue, 
			  lw_margin, promo_percentage, wos_predicted, 
			  store_level_prediction, size_integrity, 
			  style_color_status, store_status, 
			  excess, normal, shortfall, stockout, 
			  available_stores_percentage, week_to_date_sales, 
			  last_day_sales, top_25_percent, 
			  oo_dc, it_dc,instock_pct,instock_pct_details, sales_1_ago, 
			  sales_2_ago, sales_3_ago, sales_4_ago, sales_5_ago, sales_6_ago, sales_7_ago, sales_8_ago,
        floorset_date,
        min_constraints,
        max_constraints,
        capped_demand,
        estimated_demand,
        twos,
        financial_zone,
		forecasting_channel,
		retail_region
			) 
			SELECT 
			  article, 
			  product_code, 
			  store_code, 
			  "date", 
			  channel, 
			  store_avail_oh, 
			  store_in_transit, 
			  oh_dc, 
			  oo, 
			  tot_inv, 
			  lw_qty, 
			  lw_revenue, 
			  lw_margin, 
			  promo_percentage, 
			  wos_predicted, 
			  store_level_prediction, 
			  size_integrity, 
			  style_color_status, 
			  store_status, 
			  excess, 
			  normal, 
			  shortfall, 
			  stockout, 
			  available_stores_percentage, 
			  week_to_date_sales, 
			  last_day_sales, 
			  top_25_percent, 
			  oo_dc, 
			  it_dc,
			  instock_pct,
			  instock_pct_details, sales_1_ago, sales_2_ago, sales_3_ago, sales_4_ago, sales_5_ago, sales_6_ago, sales_7_ago, sales_8_ago,
        floorset_date,
        min_constraints,
        max_constraints,
        capped_demand,
        estimated_demand,
        twos,
        financial_zone,
		forecasting_channel,
		retail_region
			FROM 
			  public.store_stock_drilldown {where} RETURNING 1
			) 
			SELECT 
			  count(1) as cnt 
			FROM 
			  rows;', 50, 'public.store_stock_drilldown', 'store_code', 'pssd_idx');
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
