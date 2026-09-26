--liquibase formatted sql
--changeset samarjit.mazumder@impactanalytics.co:sync_oms_total_dc_forecast runOnChange:true stripComments:false splitStatements:false context:briscoes_sync_oms_total_dc_forecast 
--comment: initial changeset for sync_oms_total_dc_forecast

DROP PROCEDURE IF EXISTS public.sync_oms_total_dc_forecast(bool);

CREATE OR REPLACE PROCEDURE public.sync_oms_total_dc_forecast(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_oms_total_dc_forecast';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
   if _is_historic then 
            delete from 
              inventory_smart.oms_total_dc_forecast 
            where 
              true;
        end if;
  insert into inventory_smart.oms_total_dc_forecast
      (product_code,
loc_code,
channel,
fiscal_year_week,
dc_inv_bop_post_allocation,
total_store_bop_inv
      )
  select
       product_code,
loc_code,
channel,
fiscal_year_week,
dc_inv_bop_post_allocation,
50 as total_store_bop_inv
  from
    public.oms_total_dc_forecast
  on conflict ON CONSTRAINT pk_oms_total_dc_forecast do nothing;
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
