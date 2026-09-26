--liquibase formatted sql
--changeset samarjit.mazumder@impactanalytics.co:sync_forecast_alerts runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_forecast_alerts
--comment: initial changeset for sync_forecast_alerts
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_forecast_alerts();

CREATE OR REPLACE PROCEDURE public.sync_forecast_alerts()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_dc_pack_inventory';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		delete from 
		  inventory_smart.forecast_alerts 
		where 
		  true;

	insert into inventory_smart.forecast_alerts
	(
		article,
		l0_name,
		l1_name,
		l2_name,
		l3_name,
		l4_name,
		l5_name,
		l6_name,
		style_name,
		local_flag,
		info_lifecycle_description,
		lw_qty,
		lw_revenue,
		lw_margin,
		promo_percentage,
		past_4_weeks_actual,
		past_4_weeks_forecast,
		forecast_deviation,
		sku_count_deviation,
		store_penetration_deviation,
		discount_deviation,
		msrp_deviation,
		inventory_deviation,
		model_error,
		past_4_weeks_sales_avg,
		past_4_weeks_sales_deseason_avg,
		next_4_weeks_forecast_avg,
		next_4_weeks_forecast_deseason_avg,
		weekly_sales_ly_avg,
		deviation_ly,
		deviation_recent_ros,
		deviation_in_driver_estimates_flag,
		forecast_unexplainable_by_drivers_flag,
		low_model_confidence_flag,
		key_driver_volatility_flag,
		sales_forecast_divergence_flag,
		new_product_flag,
		deviation_in_driver_estimates_is_resolved,
		forecast_unexplainable_by_drivers_is_resolved,
		low_model_confidence_is_resolved,
		key_driver_volatility_is_resolved,
		sales_forecast_divergence_is_resolved,
		new_product_is_resolved,
		deviation_type
	)
	select 
		article,
		l0_name,
		l1_name,
		l2_name,
		l3_name,
		l4_name,
		l5_name,
		l6_name,
		style_name,
		local_flag,
		info_lifecycle_description,
		lw_units as lw_qty,
		lw_revenue,
		lw_margin,
		promo_percentage,
		past_4_weeks_actual,
		past_4_weeks_forecast,
		forecast_deviation,
		sku_count_deviation,
		store_penetration_deviation,
		discount_deviation,
		msrp_deviation,
		inventory_deviation,
		model_error,
		past_4_weeks_sales_avg,
		past_4_weeks_sales_deseason_avg,
		next_4_weeks_forecast_avg,
		next_4_weeks_forecast_deseason_avg,
		weekly_sales_ly_avg,
		deviation_ly,
		deviation_recent_ros,
		deviation_in_driver_estimates_flag,
		forecast_unexplainable_by_drivers_flag,
		low_model_confidence_flag,
		key_driver_volatility_flag,
		sales_forecast_divergence_flag,
		new_product_flag,
		deviation_in_driver_estimates_is_resolved,
		forecast_unexplainable_by_drivers_is_resolved,
		low_model_confidence_is_resolved,
		key_driver_volatility_is_resolved,
		sales_forecast_divergence_is_resolved,
		new_product_is_resolved,
		deviation_type
	from
		public.forecast_alerts;

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