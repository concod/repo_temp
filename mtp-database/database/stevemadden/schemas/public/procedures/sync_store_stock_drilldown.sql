--liquibase formatted sql
--changeset samarjit.mazumder@impactanalytics.co:sync_store_stock_drilldown runOnChange:true stripComments:false splitStatements:false context:SteveMadden labels:sm_sync_store_stock_drilldown
--comment:  changeset for sync_store_stock_drilldown additional columns add reverting back due to error
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
	 		select async_query into _worker from public.async_query('delete from 
	 		  inventory_smart.store_stock_drilldown 
	 		where 
	 		  true;');
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
			  wos_predicted_oh,
			  wos_predicted_oh_it,
			  store_level_prediction, size_integrity, 
			  style_color_status, store_status, 
			  excess, normal, shortfall, stockout, 
			  available_stores_percentage, week_to_date_sales, 
			  last_day_sales, 
			  oo_dc, it_dc,instock_pct,
              sales_1_ago, sales_2_ago, sales_3_ago, sales_4_ago,
			  ---new added
			  store_grade
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
			  wos_predicted_oh,
			  wos_predicted_oh_it,
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
			  oo_dc, 
			  it_dc,
			  instock_pct,
               sales_1_ago, sales_2_ago, sales_3_ago, sales_4_ago,
			   ---new added
			   store_grade
			FROM 
			  public.store_stock_drilldown {where} RETURNING 1
			) 
			SELECT 
			  count(1) as cnt 
			FROM 
			  rows;', 50, 'public.store_stock_drilldown', 'store_code', 'pssd_idx');
 		raise notice 'Step2: %', (clock_timestamp() - _st);
		-- if _is_historic then 
	 	-- 	call global.create_drop_index_list_ingestion('inventory_smart', 'store_stock_drilldown', false);
 		-- 	raise notice 'Step4: %', (clock_timestamp() - _st);
 		-- end if;
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
