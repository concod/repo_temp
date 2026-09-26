--liquibase formatted sql
--changeset aman.lakkoju:added_dc_unavailable_column runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added_dc_unavailable_column
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_oms_kpi(IN _is_historic boolean);
CREATE OR REPLACE PROCEDURE public.sync_oms_kpi(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_oms_kpi';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
   if _is_historic then 
            delete from 
              inventory_smart.oms_kpi 
            where 
              true;
        end if;
  insert into inventory_smart.oms_kpi
      (product_code,
       loc_code,
       store_inv,
       dc_inv,
       dc_unavailable,
       system_inv,
       mrpc,
       open_receipt_units,
       Safety_Stock,
       effective_lead_time,
       adjusted_forecast_qty_4w,
       adjusted_forecast_qty_4w_lc,
       adjusted_forecast_qty_8w,
       adjusted_forecast_qty_8w_lc,
       adjusted_forecast_qty_12w,
       adjusted_forecast_qty_12w_lc,
       wos,
       created_by,
       created_at, 
       updated_by, 
       updated_at 
      )
  select
       product_code,
       location,
       store_inv,
       dc_inv,
       dc_unavailable,
       system_inv,
       mrpc,
       open_receipt_units::bigint,
       Safety_Stock,
       effective_lead_time,
       adjusted_forecast_qty_4w,
       adjusted_forecast_qty_4w_lc,
       adjusted_forecast_qty_8w,
       adjusted_forecast_qty_8w_lc,
       adjusted_forecast_qty_12w,
       adjusted_forecast_qty_12w_lc, 
       wos,
       3 as created_by,
       current_timestamp as created_at,
       null as updated_by ,
       null as updated_at
  from
    --public.oms_kpi
    public.oms_kpi
  on conflict ON CONSTRAINT pk_oms_KPI do update 
  set
      store_inv = excluded.store_inv,
      dc_inv = excluded.dc_inv,
      dc_unavailable = excluded.dc_unavailable,
      system_inv = excluded.system_inv,
      mrpc = excluded.mrpc,
      open_receipt_units = excluded.open_receipt_units,
      Safety_Stock = excluded.Safety_Stock,
      effective_lead_time = excluded.effective_lead_time,
      adjusted_forecast_qty_4w = excluded.adjusted_forecast_qty_4w,
      adjusted_forecast_qty_4w_lc = excluded.adjusted_forecast_qty_4w_lc,
      adjusted_forecast_qty_8w = excluded.adjusted_forecast_qty_8w,
      adjusted_forecast_qty_8w_lc = excluded.adjusted_forecast_qty_8w_lc,
      adjusted_forecast_qty_12w = excluded.adjusted_forecast_qty_12w,
      adjusted_forecast_qty_12w_lc = excluded.adjusted_forecast_qty_12w_lc,
      wos = excluded.wos,
      updated_by = 3 ,
      updated_at = current_timestamp;
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
