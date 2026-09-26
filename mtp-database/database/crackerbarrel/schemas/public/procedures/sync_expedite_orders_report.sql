--liquibase formatted sql
--changeset bhargav.polavarapu@impactanalytics.co:sync_expedite_orders_report_cb runOnChange:true stripComments:false splitStatements:false context:Release_1_1 
--comment: adding procedure for sync_expedite_orders_report_cb

DROP PROCEDURE IF EXISTS public.sync_expedite_orders_report(bool);

CREATE OR REPLACE PROCEDURE public.sync_expedite_orders_report(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_expedite_orders_report';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
   if _is_historic then 
            delete from 
              inventory_smart.expedite_orders_report 
            where 
              true;
        end if;
  insert into inventory_smart.expedite_orders_report
      (
product_code,
loc_code,
channel,
po_id,
recom_receipt_date,
projected_delivery_date,
po_receipts,
vendor_name,
vendor_code,
po_receipts_cost,
dc_oh,
total_store_inv,
safety_stock_sto
      )
  select
product_code,
loc_code,
channel,
po_id,
CAST(recom_receipt_date AS DATE) AS recom_receipt_date,
CAST(projected_delivery_date AS DATE) AS projected_delivery_date,
po_receipts,
vendor_name,
vendor_code,
po_receipts_cost,
dc_oh,
total_store_inv,
safety_stock_sto
  from
    --public.oms_kpi
    public.expedite_orders_report
  on conflict ON CONSTRAINT pk_expedite_orders_report do nothing;

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
