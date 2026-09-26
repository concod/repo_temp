--liquibase formatted sql
--changeset ashish.gupta:sync_forecast_report runOnChange:true stripComments:false splitStatements:false context:Inv_Reporting labels:DAT-640
--comment: initial changeset for sync_forecast_report
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_forecast_report();
DROP PROCEDURE IF EXISTS public.sync_forecast_report(IN _is_historic boolean);
CREATE OR REPLACE PROCEDURE public.sync_forecast_report(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_forecast_report';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    call global.build_list_partitions('forecast_report');
	if _is_historic then 
		delete from 
		  inventory_smart.forecast_report 
		where 
		  true;
		perform global.create_drop_index_list_ingestion('inventory_smart', 'forecast_report', true);
	end if;
	INSERT INTO inventory_smart.forecast_report (
	  product_code, fiscal_year_week, actual_discount_percentage, 
	  planned_discount_percentage, actual_sales, 
	  ia_forecast, adjusted_forecast, 
	  multiplier, adjusted_forecast_error, 
	  ia_forecast_error, count_store, original_ia_forecast, original_ia_forecast_error
	) 
	SELECT 
	  product_code, 
	  fiscal_year_week, 
	  actual_discount_percentage, 
	  planned_discount_percentage, 
	  actual_sales, 
	  ia_forecast, 
	  adjusted_forecast, 
	  multiplier, 
	  adjusted_forecast_error, 
	  ia_forecast_error, 
	  count_store,
	  original_ia_forecast, 
	  original_ia_forecast_error
	FROM 
	  public.forecast_report dt 
--	  join global.product_master pm using(product_code) 
	  on conflict(fiscal_year_week, product_code) do 
	update 
	set 
	  actual_discount_percentage = excluded.actual_discount_percentage, 
	  planned_discount_percentage = excluded.planned_discount_percentage, 
	  actual_sales = excluded.actual_sales, 
	  ia_forecast = excluded.ia_forecast, 
	  adjusted_forecast = excluded.adjusted_forecast, 
	  multiplier = excluded.multiplier, 
	  adjusted_forecast_error = excluded.adjusted_forecast_error, 
	  ia_forecast_error = excluded.ia_forecast_error, 
	  count_store = excluded.count_store,
	  original_ia_forecast = excluded.original_ia_forecast,
	  original_ia_forecast_error = excluded.original_ia_forecast_error;
	if _is_historic then 
		perform global.create_drop_index_list_ingestion('inventory_smart', 'forecast_report', false);
	end if;
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
