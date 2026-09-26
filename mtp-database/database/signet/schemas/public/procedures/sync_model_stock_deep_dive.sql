-- liquibase formatted sql
-- changeset saumya.agnihotri:sync_model_stock_deep_dive runOnChange:true stripComments:false splitStatements:false context:Inv_Reporting labels:MTP-20290
-- comment: New columns added in the Model Stock deep dive report
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_model_stock_deep_dive();
DROP PROCEDURE IF EXISTS public.sync_model_stock_deep_dive(IN _is_historic boolean);
CREATE OR REPLACE PROCEDURE public.sync_model_stock_deep_dive(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_model_stock_deep_dive';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    call global.build_list_partitions('model_stock_deep_dive');
    if _is_historic then 
        delete from 
          inventory_smart.model_stock_deep_dive 
        where 
          true;
        perform global.create_drop_index_list_ingestion('inventory_smart', 'model_stock_deep_dive', true);
    end if;
    INSERT INTO inventory_smart.model_stock_deep_dive (
      store_code, product_code, fiscal_year_week, 
      dma, vpro, sub_sku_division, store_avail_oh_actuals, 
      store_avail_it_actuals, model_stock, 
      predicted_qty, adjusted_forecast_qty,
      min, max, wos, constrained_flag, sales, 
      model_stock_minus_min_stock, adjusted_forecast_qty_minus_max_stock, 
      current_in_stock_percentage, original_ia_forecast, store_group, dotcom_exclusive,
      dc_avail_oh, inprogress_allocations, vendor_name, merchandise_category, sku_current_in_stock_percentage
    ) 
    SELECT 
      store_code, 
      dt.product_code, 
      fiscal_year_week, 
      dma, 
      vpro, 
      sub_sku_division, 
      store_avail_oh_actuals, 
      store_avail_it_actuals, 
      model_stock, 
      predicted_qty, 
      adjusted_forecast_qty, 
      min, 
      max, 
      wos, 
      constrained_flag, 
      sales, 
      model_stock_minus_min_stock, 
      adjusted_forecast_qty_minus_max_stock, 
      current_in_stock_percentage,
      original_ia_forecast,
      store_group,
      dotcom_exclusive,
      dc_avail_oh,
      inprogress_allocations,
      vendor_name,
      merchandise_category,
      sku_current_in_stock_percentage
    FROM 
      public.model_stock_deep_dive dt 
--    join global.store_master sm using(store_code) 
--    join global.product_master pm using(product_code) 
      on conflict(
        fiscal_year_week, store_code, product_code
      ) do 
    update 
    set 
      dma = excluded.dma, 
      vpro = excluded.vpro, 
      sub_sku_division = excluded.sub_sku_division, 
      store_avail_oh_actuals = excluded.store_avail_oh_actuals, 
      store_avail_it_actuals = excluded.store_avail_it_actuals, 
      model_stock = excluded.model_stock, 
      predicted_qty = excluded.predicted_qty, 
      adjusted_forecast_qty = excluded.adjusted_forecast_qty, 
      min = excluded.min, 
      max = excluded.max, 
      wos = excluded.wos, 
      constrained_flag = excluded.constrained_flag, 
      sales = excluded.sales, 
      model_stock_minus_min_stock = excluded.model_stock_minus_min_stock, 
      adjusted_forecast_qty_minus_max_stock = excluded.adjusted_forecast_qty_minus_max_stock, 
      current_in_stock_percentage = excluded.current_in_stock_percentage,
      original_ia_forecast = excluded.original_ia_forecast,
      store_group = excluded.store_group,
      dotcom_exclusive = excluded.dotcom_exclusive,
      dc_avail_oh = excluded.dc_avail_oh,
      inprogress_allocations = excluded.inprogress_allocations,
      vendor_name = excluded.vendor_name,
      merchandise_category = excluded.merchandise_category,
      sku_current_in_stock_percentage = excluded.sku_current_in_stock_percentage;
    if _is_historic then 
        perform global.create_drop_index_list_ingestion('inventory_smart', 'model_stock_deep_dive', false);
    end if;
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
