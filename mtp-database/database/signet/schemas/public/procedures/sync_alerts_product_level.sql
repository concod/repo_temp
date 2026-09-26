--liquibase formatted sql
--changeset kakumanu.abhishek:sync_alerts_product_level runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-35049
--comment: added a column for constrained forecast alert
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_alerts_product_level(IN _is_historic boolean);
CREATE OR REPLACE PROCEDURE public.sync_alerts_product_level(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_alerts_product_level';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
        if _is_historic then 
            delete from 
              inventory_smart.alerts_product_level 
            where 
              true;
        end if;
        insert into inventory_smart.alerts_product_level(
          product_code, product_description, 
          l0_name, l1_name, l2_name, merchandise_category, 
          planning_ownership, product_channel_name, 
          its_store_group, its_dc_oh, its_is_resolved, 
          nsfe_fiscal_year_week, nsfe_actual_sales, 
          nsfe_inv_oh, nsfe_absolute_error, 
          nsfe_absolute_error_percentage, 
          nsfe_adjusted_forecast_qty, nsfe_is_resolved, 
          nfmscs_dc_oh, nfmscs_min, nfmscs_max, 
          nfmscs_model_stock, nfmscs_is_resolved, 
          nfmsp_dc_oh, nfmsp_min, nfmsp_max, 
          nfmsp_model_stock, nfmsp_is_resolved, 
          pdfesc_fiscal_year_week, pdfesc_actual_sales, 
          pdfesc_adjusted_forecast_qty, pdfesc_inv_oh, 
          pdfesc_absolute_error, pdfesc_absolute_error_percentage, 
          pdfesc_is_resolved, pdfep_fiscal_year_week, 
          pdfep_actual_sales, pdfep_adjusted_forecast_qty, 
          pdfep_inv_oh, pdfep_absolute_error, 
          pdfep_absolute_error_percentage, 
          pdfep_is_resolved,uip_oh, uip_wos, uip_total_forecasted_sales_26_weeks, 
          uip_is_resolved, uip_store_cnt, uip_store_inv, uisc_oh, uisc_wos, uisc_total_forecasted_sales_13_weeks, 
          uisc_is_resolved, uisc_store_cnt, uisc_store_inv, cf_oh_it, cf_oh, cf_wos, 
          cf_total_forecasted_sales_weeks, 
          cf_net_demand, cf_lead_time, cf_expected_po, 
          cf_is_resolved, initial_test_skus, 
          new_skus_forecast_error, no_future_model_stock_cl_sd, 
          no_future_model_stock_prog, percentage_dc_forecast_error_sd_cl, 
          percentage_dc_forecast_error_prog, 
          unproductive_inventory_prog, unproductive_inventory_sd_cl, 
          constrained_forecast,
          zero_forecast_ecom_alert,
          zero_forecast_sku_alert,
          zfea_dc_oh,
          zfea_balance_stores_six_weeks_forecast,
          zfea_ecom_reserve,
          zfea_ecom_sales_last_six_weeks,
          zfsa_six_weeks_forecast,
          zfsa_dc_oh,
          zfsa_total_store_inventory,
          zfsa_sales_last_six_weeks,
          zfsa_is_resolved,
          zfea_is_resolved

        ) 
        SELECT 
          product_code, 
          product_description, 
          l0_name, 
          l1_name, 
          l2_name, 
          merchandise_category, 
          planning_ownership, 
          product_channel_name, 
          its_store_group, 
          its_dc_oh, 
          its_is_resolved, 
          nsfe_fiscal_year_week, 
          nsfe_actual_sales, 
          nsfe_inv_oh, 
          nsfe_absolute_error, 
          nsfe_absolute_error_percentage, 
          nsfe_adjusted_forecast_qty, 
          nsfe_is_resolved, 
          nfmscs_dc_oh, 
          nfmscs_min, 
          nfmscs_max, 
          nfmscs_model_stock, 
          nfmscs_is_resolved, 
          nfmsp_dc_oh, 
          nfmsp_min, 
          nfmsp_max, 
          nfmsp_model_stock, 
          nfmsp_is_resolved, 
          pdfesc_fiscal_year_week, 
          pdfesc_actual_sales, 
          pdfesc_adjusted_forecast_qty, 
          pdfesc_inv_oh, 
          pdfesc_absolute_error, 
          pdfesc_absolute_error_percentage, 
          pdfesc_is_resolved, 
          pdfep_fiscal_year_week, 
          pdfep_actual_sales, 
          pdfep_adjusted_forecast_qty, 
          pdfep_inv_oh, 
          pdfep_absolute_error, 
          pdfep_absolute_error_percentage, 
          pdfep_is_resolved,
          uip_oh, 
          uip_wos, 
          uip_total_forecasted_sales_26_weeks, 
          uip_is_resolved,
          uip_store_cnt,
          uip_store_inv,
          uisc_oh,
          uisc_wos, 
          uisc_total_forecasted_sales_13_weeks, 
          uisc_is_resolved,
          uisc_store_cnt,
          uisc_store_inv,
          cf_oh_it,
          cf_oh, 
          cf_wos, 
          cf_total_forecasted_sales_weeks, 
          cf_net_demand, 
          cf_lead_time, 
          cf_expected_po, 
          cf_is_resolved, 
          initial_test_skus, 
          new_skus_forecast_error, 
          no_future_model_stock_cl_sd, 
          no_future_model_stock_prog, 
          percentage_dc_forecast_error_sd_cl, 
          percentage_dc_forecast_error_prog, 
          unproductive_inventory_prog, 
          unproductive_inventory_sd_cl, 
          constrained_forecast,
          zero_forecast_ecom_alert,
          zero_forecast_sku_alert,
          zfea_dc_oh,
          zfea_balance_stores_six_weeks_forecast,
          zfea_ecom_reserve,
          zfea_ecom_sales_last_six_weeks,
          zfsa_six_weeks_forecast,
          zfsa_dc_oh,
          zfsa_total_store_inventory,
          zfsa_sales_last_six_weeks,
          zfsa_is_resolved,
          zfea_is_resolved
        FROM 
          public.alerts_product_level;
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