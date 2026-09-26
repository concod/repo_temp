--liquibase formatted sql
--changeset rohan.santhsoh@impactanalytics.co:sync_dashboard_kpi_table runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:aritzia_sync_dashboard_kpi_table
--comment: initial changeset for sync_dashboard_kpi_table
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_dashboard_kpi_table();
CREATE OR REPLACE PROCEDURE public.sync_dashboard_kpi_table()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_dashboard_kpi_table';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		delete from 
		  inventory_smart.dashboard_kpi_table 
		where 
		  true; 
		INSERT INTO inventory_smart.dashboard_kpi_table (
			s0_name,
			s1_name,
			primary_style_id,
			fiscal_year_week,
			l0_id,
			l0_name,
			l1_id,
			l1_name,
			l2_id,
			l2_name,
			l3_id,
			l3_name,
			l4_id,
			l4_name,
			l5_id,
			l5_name,
			forecast_units_next_week,
			forecast_units_next_4_weeks,
			forecast_units_next_12_weeks,
			forecast_units_last_week,
			forecast_units_last_4_weeks,
			forecast_units_last_12_weeks,
			actuals_last_week,
			actuals_last_4_weeks,
			actuals_last_12_weeks,
			fs_forecast_wape_last_week,
			fs_forecast_wape_last_4_weeks,
			fs_forecast_wape_last_12_weeks
		) 
		SELECT 
			s0_name,
			s1_name,
			primary_style_id,
			fiscal_year_week,
			l0_id,
			l0_name,
			l1_id,
			l1_name,
			l2_id,
			l2_name,
			l3_id,
			l3_name,
			l4_id,
			l4_name,
			l5_id,
			l5_name,
			forecast_units_next_week,
			forecast_units_next_4_weeks,
			forecast_units_next_12_weeks,
			forecast_units_last_week,
			forecast_units_last_4_weeks,
			forecast_units_last_12_weeks,
			actuals_last_week,
			actuals_last_4_weeks,
			actuals_last_12_weeks,
			fs_forecast_wape_last_week,
			fs_forecast_wape_last_4_weeks,
			fs_forecast_wape_last_12_weeks
		FROM 
		  public.dashboard_kpi_table;
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