--liquibase formatted sql
--changeset aman_lakkoju:sync_forecast_alerts_updated runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_forecast_alerts_updated
--comment: sync_forecast_alerts_updated
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_forecast_alerts();
CREATE OR REPLACE PROCEDURE public.sync_forecast_alerts()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_forecast_alerts';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		delete from 
		  inventory_smart.alerts_product_level
		where 
		  true; 


		INSERT INTO inventory_smart.forecast_alerts (
			article,
			l0_name,
			l1_name,
			l2_name,
			l3_name,
			product_type,
			item_status,
			sales_1_ago,
			lw_margin,
			lw_revenue,
			promo_percentage,
			new_product_alert_flag,
			past_4_weeks_actual,
			next_4_weeks_forecast,
			past_4_weeks_forecast,
			past_4_weeks_sales_avg,
			next_4_weeks_forecast_avg,
			mfp_forecast_4weeks,
			new_deviation_alert_flag,
			accuracy_perc,
			forecast_error_perc_alert_flag,
			seasonal_error_perc_alert_flag,
			core_error_perc_alert_flag,
			mfp_deviation_alert_flag,
			mfp_deviation,
			past_4_weeks_sales_deseason_avg,
			next_4_weeks_forecast_deseason_avg,
			forecast_deviation,
			sku_count_deviation,
			store_penetration_deviation,
			discount_deviation,
			msrp_deviation,
			inventory_deviation,
			model_error,
			weekly_sales_ly_avg,
			deviation_ly,
			deviation_recent_ros,
			assumption_mismatch_flag,
			unpredictable_market_shift_flag,
			data_quality_warning_flag,
			new_launch_monitor_flag,
			significant_strategy_change_flag,
			new_deviation_alert_is_resolved,
			forecast_error_perc_is_resolved,
			seasonal_error_perc_is_resolved,
			core_error_perc_is_resolved,
			mfp_deviation_alert_is_resolved,
			assumption_mismatch_is_resolved,
			unpredictable_market_shift_is_resolved,
			data_quality_warning_is_resolved,
			new_launch_monitor_is_resolved,
			significant_strategy_change_is_resolved,
			deviation_type

		)
		SELECT 
			article,
			l0_name,
			l1_name,
			l2_name,
			l3_name,
			a.product_type,
			a.item_status,
			sales_1_ago,
			lw_margin,
			lw_revenue,
			promo_percentage,
			new_product_alert_flag,
			past_4_weeks_actual,
			next_4_weeks_forecast,
			past_4_weeks_forecast,
			past_4_weeks_sales_avg,
			next_4_weeks_forecast_avg,
			mfp_forecast_4weeks,
			new_deviation_alert_flag,
			accuracy_perc,
			forecast_error_perc_alert_flag,
			seasonal_error_perc_alert_flag,
			core_error_perc_alert_flag,
			mfp_deviation_alert_flag,
			mfp_deviation,
			past_4_weeks_sales_deseason_avg,
			next_4_weeks_forecast_deseason_avg,
			forecast_deviation,
			sku_count_deviation,
			store_penetration_deviation,
			discount_deviation,
			msrp_deviation,
			inventory_deviation,
			model_error,
			weekly_sales_ly_avg,
			deviation_ly,
			deviation_recent_ros,
			assumption_mismatch_flag,
			unpredictable_market_shift_flag,
			data_quality_warning_flag,
			new_launch_monitor_flag,
			significant_strategy_change_flag,
			new_deviation_alert_is_resolved,
			forecast_error_perc_is_resolved,
			seasonal_error_perc_is_resolved,
			core_error_perc_is_resolved,
			mfp_deviation_alert_is_resolved,
			assumption_mismatch_is_resolved,
			unpredictable_market_shift_is_resolved,
			data_quality_warning_is_resolved,
			new_launch_monitor_is_resolved,
			significant_strategy_change_is_resolved,
			deviation_type

		FROM 
		  public.forecast_alerts a
		  left join (select distinct article,product_type,item_status from global.product_attributes_filter ) paf using(article);
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
