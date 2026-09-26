--liquibase formatted sql
--changeset liquibase:sync_constraint_master_forecast_column runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-21791
--comment: SP for sync_constraint_master_forecast_column
DROP PROCEDURE IF EXISTS public.sync_constraint_master_forecast_column();
CREATE OR REPLACE PROCEDURE public.sync_constraint_master_forecast_column()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_constraint_master_forecast_column';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		update inventory_smart.constraint_master
		set user_adjusted_forecast = NULL 
		where user_adjusted_forecast is not null;

		update inventory_smart.constraint_master a
		SET user_adjusted_forecast = b.user_adjusted_forecast  
		FROM public.eligible_sku_store_forecast b
		where a.product_code = b.product_code
		and a.store_code = b.store_code 
		and a.l0_name = b.l0_name;
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
