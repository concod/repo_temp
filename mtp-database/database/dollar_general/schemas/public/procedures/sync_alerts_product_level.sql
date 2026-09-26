--liquibase formatted sql
--changeset swapnil.bhange-2:sync_alerts_product_level runOnChange:true stripComments:false splitStatements:false context:ASync_Procedures labels:0002
--comment: added two columns for sync_alerts_product_level
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_alerts_product_level();
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
BEGIN
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

INSERT INTO inventory_smart.alerts_product_level(
         product_code
        ,article
		    ,launch_date
        ,product_description
        ,l0_code
        ,l0_name
        ,l1_name
        ,l3_name
        ,l4_name
        ,primary_sku
        ,pa_component_sku
        ,pa_quantity_coefficient
        ,pa_last_week_sales_units
        ,pa_total_inventory
        ,pa_dc_total_inventory
        ,pa_store_total_inventory
        ,pa_last_allocated
        ,pa_is_resolved
        ,sea_plan_start_date
        ,sea_plan_end_date
        ,sea_plan_expiry_date
        ,sea_updated_at
        ,sea_dc_on_hand
        ,sea_is_resolved
        ,lafnpa_fiscal_year_week
        ,lafnpa_actual_sales
        ,lafnpa_adjusted_forecast_qty
        ,lafnpa_inv_oh
        ,lafnpa_absolute_error
        ,lafnpa_absolute_error_percentage
        ,lafnpa_is_resolved
        ,lafspa_product_description
        ,lafspa_fiscal_year_week
        ,lafspa_actual_sales
        ,lafspa_adjusted_forecast_qty
        ,lafspa_inv_oh
        ,lafspa_absolute_error
        ,lafspa_absolute_error_percentage
        ,lafspa_is_resolved
        ,hda_past_4_weeks_actual
        ,hda_next_4_weeks_forecast
        ,hda_recent_deviation
        ,hda_is_resolved
        ,pdq_alert
        ,season_ending_alert
        ,low_accuracy_forecast_new_products_alert
        ,low_accuracy_forecast_seasonal_products_alert
        ,high_deviation_alert
        )
        SELECT 
        product_code
		   ,product_code as article
        ,cast(null as date) as launch_date
        ,product_description
        ,l0_code
        ,l0_name
        ,l1_name
        ,l3_name
        ,l4_name
        ,primary_sku
        ,pa_component_sku
        ,pa_quantity_coefficient
        ,pa_last_week_sales_units
        ,pa_total_inventory
        ,pa_dc_total_inventory
        ,pa_store_total_inventory
        ,pa_last_allocated
        ,pa_is_resolved
        ,sea_plan_start_date
        ,sea_plan_end_date
        ,sea_plan_expiry_date
        ,sea_updated_at
        ,sea_dc_on_hand
        ,sea_is_resolved
        ,lafnpa_fiscal_year_week
        ,lafnpa_actual_sales
        ,lafnpa_adjusted_forecast_qty
        ,lafnpa_inv_oh
        ,lafnpa_absolute_error
        ,lafnpa_absolute_error_percentage
        ,lafnpa_is_resolved
        ,lafspa_product_description
        ,lafspa_fiscal_year_week
        ,lafspa_actual_sales
        ,lafspa_adjusted_forecast_qty
        ,lafspa_inv_oh
        ,lafspa_absolute_error
        ,lafspa_absolute_error_percentage
        ,lafspa_is_resolved
        ,hda_past_4_weeks_actual
        ,hda_next_4_weeks_forecast
        ,hda_recent_deviation
        ,hda_is_resolved
        ,pdq_alert
        ,season_ending_alert
        ,low_accuracy_forecast_new_products_alert
        ,low_accuracy_forecast_seasonal_products_alert
        ,high_deviation_alert
        FROM public.alerts_product_level;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
	end;
$procedure$
;
