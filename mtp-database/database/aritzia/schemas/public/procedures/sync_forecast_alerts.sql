--liquibase formatted sql
--changeset rohan.santhsoh@impactanalytics.co:sync_forecast_alerts runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:aritzia_sync_forecast_alerts
--comment: initial changeset for sync_forecast_alerts
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
		  inventory_smart.forecast_alerts 
		where 
		  true; 
		INSERT INTO inventory_smart.forecast_alerts (
      s0_name,
      s1_name,
      l5_name,
      fiscal_year_week,
      l0_name,
      l1_name,
      l2_name,
      l3_name,
      l4_name,
      past_1_week_actual_sales,
      past_1_week_wape,
      past_season_actual_sales,
      this_season_actual_sales,
      last_season_wape,
      this_season_wape,
      next_1_week_agg_forecast,
      next_4_week_agg_forecast,
      next_12_week_agg_forecast,
      next_season_agg_forecast,
      country_channel_accuracy_past_4_week,
      country_channel_accuracy_past_8_week,
      country_channel_accuracy_past_12_week,
      zero_forecast_flag,
      under_forecast_trend,
      over_forecast_trend,
      override_accuracy_gap_last_4_weeks,
      override_accuracy_gap_last_8_weeks,
      override_accuracy_gap_last_12_weeks,
      model_drift
		) 
		SELECT 
      s0_name,
      s1_name,
      l5_name,
      fiscal_year_week,
      l0_name,
      l1_name,
      l2_name,
      l3_name,
      l4_name,
      ROUND(past_1_week_actual_sales::numeric,2),
      ROUND(past_1_week_wape::numeric,2),
      ROUND(past_season_actual_sales::numeric,2),
      ROUND(this_season_actual_sales::numeric,2),
      ROUND(last_season_wape::numeric,2),
      ROUND(this_season_wape::numeric,2),
      ROUND(next_1_week_agg_forecast::numeric,2),
      ROUND(next_4_week_agg_forecast::numeric,2),
      ROUND(next_12_week_agg_forecast::numeric,2),
      ROUND(next_season_agg_forecast::numeric,2),
      country_channel_accuracy_past_4_week,
      country_channel_accuracy_past_8_week,
      country_channel_accuracy_past_12_week,
      zero_forecast_flag,
      under_forecast_trend,
      over_forecast_trend,
      override_accuracy_gap_last_4_weeks,
      override_accuracy_gap_last_8_weeks,
      override_accuracy_gap_last_12_weeks,
      model_drift
		FROM 
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