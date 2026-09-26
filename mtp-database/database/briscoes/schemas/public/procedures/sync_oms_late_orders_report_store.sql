--liquibase formatted sql
--changeset kanishka.parashar@impactanalytics.co:sync_oms_late_orders_report_store_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_late_orders_report_store_1
--comment: initial changeset for sync_late_orders_report_store_1
--rollback: SELECT 1

 DROP PROCEDURE IF EXISTS public.sync_oms_late_orders_report_store(bool);


CREATE OR REPLACE PROCEDURE public.sync_oms_late_orders_report_store(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_oms_late_orders_report_store';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
  
   if _is_historic then 
             delete from 
               inventory_smart.oms_late_orders_report_store 
             where 
               true;
         end if;
   INSERT INTO inventory_smart.oms_late_orders_report_store
(
    vendor_code,
    vendor_name,
    po_id,
    product_code,
    style,
    article,
    size,
    channel,
    store_code,
    order_date,
    projected_delivery_date,
    store_oh,
    total_order_qty,
    total_order_cost,
    total_received_qty,
    total_received_cost,
    late_order_qty,
    late_order_cost,
    order_qty_four_weeks,
    order_cost_four_weeks
)
SELECT
    vendor_code,
    vendor_name,
    po_id,
    product_code,
    style,
    article,
    size,
    channel,
    store_code,
    order_date,
    projected_delivery_date,
    store_oh,
    total_order_qty,
    total_order_cost,
    total_received_qty,
    total_received_cost,
    late_order_qty,
    late_order_cost,
    order_qty_four_weeks,
    order_cost_four_weeks
FROM public.oms_late_orders_report_store;


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
