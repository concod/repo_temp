-- liquibase formatted sql
-- changeset kanishka.parashar@impactanalytics.co:sync_oms_kpi_2 runOnChange:true stripComments:false splitStatements:false context:Release_1.1 labels:oms_kpi_update
-- comment: initial changeset for sync_oms_kpi_2

DROP PROCEDURE IF EXISTS public.sync_oms_kpi(bool);

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
INSERT INTO inventory_smart.oms_kpi
  (product_code,
  loc_code,
  channel,
  store_inv,
  dc_inv,
  system_inv,
  mrpc,
  open_receipt_units,
  created_by,
  created_at,
  updated_by,
  updated_at,
  effective_lead_time,
  adjusted_forecast_qty_4w,
  adjusted_forecast_qty_4w_lc,
  adjusted_forecast_qty_8w,
  adjusted_forecast_qty_8w_lc,
  adjusted_forecast_qty_12w,
  adjusted_forecast_qty_12w_lc,
  wos,
  target_service_level,
  ss_base,
  min_order_quantity_sku,
  order_multiple)
SELECT
  src.product_code,
  src.loc_code,
  src.channel,
  src.store_inv,
  src.dc_inv,
  src.system_inv,
  src.mrpc,
  src.open_receipt_units,
  src.created_by,
  src.created_at,
  NULL as updated_by,
  current_timestamp as updated_at,
  src.effective_lead_time,
  src.adjusted_forecast_qty_4w,
  src.adjusted_forecast_qty_4w_lc,
  src.adjusted_forecast_qty_8w,
  src.adjusted_forecast_qty_8w_lc,
  src.adjusted_forecast_qty_12w,
  src.adjusted_forecast_qty_12w_lc,
  src.wos,
  src.target_service_level,
  src.ss_base,
  src.min_order_quantity_sku,
  src.order_multiple
FROM public.oms_kpi AS src
ON CONFLICT (product_code, loc_code, channel)


DO UPDATE
SET
  store_inv=EXCLUDED.store_inv,
  dc_inv=EXCLUDED.dc_inv,
  system_inv=EXCLUDED.system_inv,
  mrpc=EXCLUDED.mrpc,
  open_receipt_units=EXCLUDED.open_receipt_units,
  created_by=EXCLUDED.created_by,
  created_at=EXCLUDED.created_at,
  updated_by=NULL,
  updated_at=current_timestamp,
  effective_lead_time=EXCLUDED.effective_lead_time,
  adjusted_forecast_qty_4w=EXCLUDED.adjusted_forecast_qty_4w,
  adjusted_forecast_qty_4w_lc=EXCLUDED.adjusted_forecast_qty_4w_lc,
  adjusted_forecast_qty_8w=EXCLUDED.adjusted_forecast_qty_8w,
  adjusted_forecast_qty_8w_lc=EXCLUDED.adjusted_forecast_qty_8w_lc,
  adjusted_forecast_qty_12w=EXCLUDED.adjusted_forecast_qty_12w,
  adjusted_forecast_qty_12w_lc=EXCLUDED.adjusted_forecast_qty_12w_lc,
  wos=EXCLUDED.wos,
  target_service_level=EXCLUDED.target_service_level,
  ss_base=EXCLUDED.ss_base,
 min_order_quantity_sku=EXCLUDED.min_order_quantity_sku,
order_multiple=EXCLUDED.order_multiple;
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
