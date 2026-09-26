--liquibase formatted sql
--changeset kaustubh.gupta:sync_forecast_alerts_demand_zero runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_forecast_alerts_demand_zero
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_forecast_alerts_demand_zero();
CREATE OR REPLACE PROCEDURE public.sync_forecast_alerts_demand_zero()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_forecast_alerts_demand_zero';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		delete from 
		inventory_smart.forecast_alerts_demand_zero
		where 
		true; 


		INSERT INTO inventory_smart.forecast_alerts_demand_zero (
		product_code,
		store_code,
		past_4_week_actuals,
		next_4_week_forecast,
		ly_past_4_week_actuals,
		ly_next_4_week_actuals,
		oh,
		oo,
		it,
		launch_date,
		l2_name,
		l3_name,
		l4_name,
		l5_name,
		primary_trait_desc,
		product_type,
		item_status,
		store_name,
		channel,
		region,
		state,
		district,
		store_attribute_1,
		zerodemand_is_resolved
		) 
		SELECT 
		product_code,
		store_code,
		past_4_week_actuals,
		next_4_week_forecast,
		ly_past_4_week_actuals,
		ly_next_4_week_actuals,
		oh,
		oo,
		it,
		launch_date,
		l2_name,
		l3_name,
		l4_name,
		l5_name,
		primary_trait_desc,
		product_type,
		item_status,
		store_name,
		channel,
		region::int,
		state,
		district::int,
		store_attribute_1::int,
		0  as zerodemand_is_resolved
		FROM 
		public.forecast_alerts_demand_zero;
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
