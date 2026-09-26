--liquibase formatted sql
--changeset swapnil.bhange:sync_alerts_product_store_level_2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-23649_2
--comment: updated SP sync_alerts_product_store_level
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_alerts_product_store_level(IN _is_historic boolean);
CREATE OR REPLACE PROCEDURE public.sync_alerts_product_store_level(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_alerts_product_store_level';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
   		if _is_historic then 
   	 		delete from 
   	 		  inventory_smart.alerts_product_store_level 
   	 		where 
   	 		  true;
    		end if;
    		insert into inventory_smart.alerts_product_store_level (
   		  product_code, 
          product_description, 
   		  store_code, 
		  ms_store_code_int,
          store_description, 
          merchandise_category, 
   		  planning_ownership, 
          l0_name, 
          l1_name, 
   		  l2_name, 
          product_channel_name, 
          channel, 
   		  state, 
          district, 
          city, 
          store_name,
          store_code_name,
   		  store_channel_description,
   		  fom_first_weekly_predicted_qty, 
   		  fom_second_weekly_predicted_qty, 
   		  fom_third_weekly_predicted_qty, 
   		  fom_fourth_weekly_predicted_qty, 
		  fom_next_4_weeks_predicted_qty,
   		  fom_max_stock, 
          fom_store_grade, 
   		  fom_is_resolved, 
          msviaf_min, 
          msviaf_max, 
   		  msviaf_wos, 
          msviaf_model_stock, 
   		  msviaf_fiscal_year_week, 
          msviaf_ia_forecast_2weeks, 
   		  msviaf_adjusted_forecast_2weeks, 
   		  msviaf_ia_forecast_4weeks, 
          msviaf_adjusted_forecast_4weeks, 
   		  msviaf_last_week_min_model_stock, 
   		  msviaf_product_description, 
          msviaf_store_description, 
   		  msviaf_store_grade, 
          msviaf_is_resolved, 
   		  ms_date, 
          ms_fiscal_week_end_date, 
   		  ms_fiscal_year_week, 
          ms_min, 
          ms_max, 
   		  ms_wos, 
          ms_ia_forecasts_store_wos, 
   		  ms_adjusted_forecasts_store_wos, 
   		  ms_model_stock, 
		  ms_model_stock_after,
          ms_constrained_flag, 
		  ms_sma_ecomm_reserve,
		  ms_dc_ecomm_reserve,
		  ms_ecomm_reserve,
   		  ms_sku_store_constrained_flag, 
 		  ms_store_inventory,
		  ms_dc_oh,
		  ms_edit_tracker,
   		  ms_is_resolved, 
          ci_date, 
          ci_fiscal_year_week, 
   		  ci_wos, 
          ci_adjusted_forecasts_store_wos, 
   		  ci_max, 
          ci_min, 
          ci_model_stock, 
          ci_next_4_weeks_forecast, 
   		  ci_sku_store_constrained_flag, 
          ci_store_inventory, 
          ci_dc_oh, 
   		  ci_is_resolved, 
          forecast_over_max, 
   		  ms_vs_ia_forecast, 
          model_stock, 
   		  constrained_inventory
   		) 
   		SELECT 
   		  product_code, 
          product_description, 
   		  store_code, 
		  ms_store_code_int,
          store_description, 
          merchandise_category, 
   		  planning_ownership, 
          l0_name, 
          l1_name, 
   		  l2_name, 
          product_channel_name, 
          channel, 
   		  state, 
          district, 
          city, 
          store_name,
          store_code_name,
   		  store_channel_description,
   		  fom_first_weekly_predicted_qty, 
   		  fom_second_weekly_predicted_qty, 
   		  fom_third_weekly_predicted_qty, 
   		  fom_fourth_weekly_predicted_qty, 
		  fom_next_4_weeks_predicted_qty,
   		  fom_max_stock, 
          fom_store_grade, 
   		  fom_is_resolved, 
          msviaf_min, 
          msviaf_max, 
   		  msviaf_wos, 
          msviaf_model_stock, 
   		  msviaf_fiscal_year_week, 
          msviaf_ia_forecast_2weeks, 
   		  msviaf_adjusted_forecast_2weeks, 
   		  msviaf_ia_forecast_4weeks, 
          msviaf_adjusted_forecast_4weeks, 
   		  msviaf_last_week_min_model_stock, 
   		  msviaf_product_description, 
          msviaf_store_description, 
   		  msviaf_store_grade, 
          msviaf_is_resolved, 
   		  ms_date, 
          ms_fiscal_week_end_date, 
   		  ms_fiscal_year_week, 
          ms_min, 
          ms_max, 
   		  ms_wos, 
          ms_ia_forecasts_store_wos, 
   		  ms_adjusted_forecasts_store_wos, 
   		  ms_model_stock, 
		  ms_model_stock_after,
          ms_constrained_flag, 
		  ms_sma_ecomm_reserve,
		  ms_dc_ecomm_reserve,
		  ms_ecomm_reserve,
   		  ms_sku_store_constrained_flag, 
 		  ms_store_inventory,
		  ms_dc_oh,
		  ms_edit_tracker,
   		  ms_is_resolved, 
          ci_date, 
          ci_fiscal_year_week, 
   		  ci_wos, 
          ci_adjusted_forecasts_store_wos, 
   		  ci_max, 
          ci_min, 
          ci_model_stock, 
          ci_next_4_weeks_forecast, 
   		  ci_sku_store_constrained_flag, 
          ci_store_inventory, 
          ci_dc_oh, 
   		  ci_is_resolved, 
          forecast_over_max, 
   		  ms_vs_ia_forecast, 
          model_stock, 
   		  constrained_inventory 
   		FROM 
   		  public.alerts_product_store_level;
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
