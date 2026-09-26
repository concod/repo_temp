--liquibase formatted sql
--changeset sidhartha.c@impactanalytics.co:sync_oms_kpi_store_v3 runOnChange:true stripComments:false splitStatements:false context:Release_1.1 labels:sync_oms_po_master
--comment: initial changeset sync_oms_kpi_store_v3

DROP PROCEDURE IF EXISTS public.sync_oms_kpi_store();

CREATE OR REPLACE PROCEDURE public.sync_oms_kpi_store(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_oms_kpi_store';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
  IF _is_historic THEN 
    DELETE FROM inventory_smart.oms_kpi_store;
  END IF;

  INSERT INTO inventory_smart.oms_kpi_store (
    product_code,
    store_code,
    channel,
    vendor_code,
    vendor_name,
    store_oh,
    store_inv,
    system_inv,
    dc_inv,
    mrpc,
    open_receipt_units,
    safety_stock,
    created_by,
    created_at,
    updated_by,
    updated_at,
    effective_lead_time,
    wos,
    target_service_level,
    ss_base,
    order_multiple,
    min_order_quantity_style,
    max_order_quantity_style,
    min_order_quantity_sku,
    max_order_quantity_sku,
    min_order_quantity_shipment,
    max_order_quantity_shipment,
    year_week
  )
  SELECT 
    src.product_code,
    src.store_code,  
    src.channel,
    src.vendor_code,
    src.vendor_name,
    src.store_oh,
    src.store_inv,
    src.system_inv,
    null as dc_inv, -- remap dc_inv to system_inv
    src.mrpc,
    src.open_receipt_units,
    src.safety_stock,
    (SELECT user_code FROM "global".user_master WHERE email='ia_system@impactanalytics.co'),
    src.created_at,
    (SELECT user_code FROM "global".user_master WHERE email='ia_system@impactanalytics.co'),
    CURRENT_TIMESTAMP,
    src.effective_lead_time,
    src.wos,
    src.target_service_level,
    src.ss_base,
    src.order_multiple,
    src.min_order_quantity_style,
    src.max_order_quantity_style,
    src.min_order_quantity_sku,
    src.max_order_quantity_sku,
    src.min_order_quantity_shipment,
    src.max_order_quantity_shipment,
    src.year_week
  FROM public.oms_kpi_store AS src
  ON CONFLICT (product_code, store_code, channel)
  DO UPDATE 
  SET 
    store_oh=EXCLUDED.store_oh,
    vendor_name = EXCLUDED.vendor_name,
    store_inv = EXCLUDED.store_inv,
    system_inv = EXCLUDED.system_inv,
    mrpc = EXCLUDED.mrpc,
    open_receipt_units = EXCLUDED.open_receipt_units,
    safety_stock = EXCLUDED.safety_stock,
    updated_by = (SELECT user_code FROM "global".user_master WHERE email='ia_system@impactanalytics.co'),
    updated_at = CURRENT_TIMESTAMP,
    effective_lead_time = EXCLUDED.effective_lead_time,
    wos = EXCLUDED.wos,
    target_service_level = EXCLUDED.target_service_level,
    ss_base = EXCLUDED.ss_base,
    order_multiple = EXCLUDED.order_multiple,
    min_order_quantity_style = EXCLUDED.min_order_quantity_style,
    max_order_quantity_style = EXCLUDED.max_order_quantity_style,
    min_order_quantity_sku = EXCLUDED.min_order_quantity_sku,
    max_order_quantity_sku = EXCLUDED.max_order_quantity_sku,
    min_order_quantity_shipment = EXCLUDED.min_order_quantity_shipment,
    max_order_quantity_shipment = EXCLUDED.max_order_quantity_shipment,
    year_week = EXCLUDED.year_week;
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
