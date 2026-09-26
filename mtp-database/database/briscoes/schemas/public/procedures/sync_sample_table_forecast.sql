--liquibase formatted sql
--changeset navin.chandan@impactanalytics.co:sync_sample_table_forecast runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_sample_table_forecast
--comment: initial changeset for sync_sample_table_forecast
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_sample_table_forecast();
CREATE OR REPLACE PROCEDURE public.sync_sample_table_forecast()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_sample_table_forecast';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    DELETE FROM 
      inventory_smart.sample_table_forecast 
    WHERE 
      true;
    INSERT INTO inventory_smart.sample_table_forecast (
      product_code, article, store_code, fiscal_year_week, final_forecast_qty
    ) 
    SELECT 
      product_code, article, store_code, fiscal_year_week, final_forecast_qty
    FROM public.sample_table_forecast x ;
   
	call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END
$procedure$
;
