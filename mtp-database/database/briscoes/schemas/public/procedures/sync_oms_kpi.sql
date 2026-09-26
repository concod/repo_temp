--liquibase formatted sql
--changeset sidhartha.c@impactanalytics.co:sync_oms_kpi runOnChange:true stripComments:false splitStatements:false context:Release_1.1 labels:sync_oms_kpi
--comment: initial changeset sync_oms_kpi 

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
	vendor_code, 
	vendor_name, 
	store_inv, 
	dc_inv, 
	system_inv, 
	mrpc, 
	open_receipt_units, 
	safety_stock, 
	created_by, 
	created_at, 
	updated_by, 
	updated_at, 
	column_updated, 
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
	order_multiple, 
	min_order_quantity_style, 
	max_order_quantity_style, 
	min_order_quantity_sku, 
	max_order_quantity_sku, 
	min_order_quantity_shipment, 
	max_order_quantity_shipment, 
	year_week)
SELECT 
	src.product_code, 
	src.loc_code, 
	src.channel, 
	src.vendor_code, 
	src.vendor_name, 
	src.store_inv, 
	src.dc_inv, 
	src.system_inv, 
	src.mrpc, 
	src.open_receipt_units, 
	src.safety_stock, 
	(select user_code from "global".user_master where email='ia_system@impactanalytics.co') as created_by,
	src.created_at, 
	(select user_code from "global".user_master where email='ia_system@impactanalytics.co') as updated_by, 
	current_timestamp as updated_at, 
	'-' as column_updated, 
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
	src.order_multiple,
	src.min_order_quantity_style, 
	src.max_order_quantity_style, 
	src.min_order_quantity_sku, 
	src.max_order_quantity_sku, 
	src.min_order_quantity_shipment, 
	src.max_order_quantity_shipment, 
	src.year_week
FROM public.oms_kpi AS src
ON CONFLICT (product_code, loc_code, channel, vendor_code)
DO UPDATE 
SET 
	vendor_name=EXCLUDED.vendor_name, 
	store_inv=EXCLUDED.store_inv, 
	dc_inv=EXCLUDED.dc_inv, 
	system_inv=EXCLUDED.system_inv, 
	mrpc=EXCLUDED.mrpc, 
	open_receipt_units=EXCLUDED.open_receipt_units, 
	safety_stock=EXCLUDED.safety_stock,  
	updated_by=(select user_code from "global".user_master where email='ia_system@impactanalytics.co'), 
	updated_at=current_timestamp, 
	column_updated=EXCLUDED.column_updated, 
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
	order_multiple=EXCLUDED.order_multiple,
	min_order_quantity_style=EXCLUDED.min_order_quantity_style, 
	max_order_quantity_style=EXCLUDED.max_order_quantity_style, 
	min_order_quantity_sku=EXCLUDED.min_order_quantity_sku, 
	max_order_quantity_sku=EXCLUDED.max_order_quantity_sku, 
	min_order_quantity_shipment=EXCLUDED.min_order_quantity_shipment, 
	max_order_quantity_shipment=EXCLUDED.max_order_quantity_shipment, 
	year_week=EXCLUDED.year_week;
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
