--liquibase formatted sql
--changeset poojith.krishna@impactanalytics.co:sync_oms_kpi runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:figs_sync_forecast_alerts
--comment: initial changeset for sync_forecast_alert
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_oms_kpi();
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
dc_inv,
safety_stock,
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
system_inv,
open_receipt_units,
channel,
store_inv,
mrpc,
min_order_quantity_style,
max_order_quantity_style,
min_order_quantity_sku,
max_order_quantity_sku,
min_order_quantity_shipment,
max_order_quantity_shipment,
order_multiple,
year_week,
vendor_code,
vendor_name
      )
  select
       product_code,
loc_code,
dc_inv,
safety_stock,
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
system_inv,
open_receipt_units,
channel,
store_inv,
mrpc,
min_order_quantity_style,
max_order_quantity_style,
min_order_quantity_sku,
max_order_quantity_sku,
min_order_quantity_shipment,
max_order_quantity_shipment,
order_multiple,
year_week,
vendor_code,
vendor_name
  from
    --public.oms_kpi
    public.oms_kpi
  on conflict ON CONSTRAINT pk_oms_kpi do nothing;
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
