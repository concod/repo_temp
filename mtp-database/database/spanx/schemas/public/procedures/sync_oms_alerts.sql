-- liquibase formatted sql
-- changeset gurjotsingh.bindra@impactanalytics.co:sync_oms_alerts sp runOnChange:true stripComments:false splitStatements:false context:Release_1.1 labels:sync_oms_alerts sp updated
-- comment:added coulmn "is_recom_order_resolved,"

DROP PROCEDURE if exists public.sync_oms_alerts(_is_historic);

CREATE OR REPLACE PROCEDURE public.sync_oms_alerts(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_oms_alerts';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    delete from 
              inventory_smart.oms_alerts
            where 
              true;
insert
	into
	inventory_smart.oms_alerts (
  	"style",
	article,
	"size",
	product_code,
	loc_code,
	channel,
	vendor_code,
	recom_receipt_date,
	next_order_cycle_receipt_date,
	historic_sales_unit,
	historic_sales_value,
	lost_sales_aggregated_unit,
	lost_sales_aggregated_value,
	potential_sales_unit,
	potential_sales_value,
	dc_wos_oh_oo_it,
	dc_store_wos_oh_oo_it,
	recom_order,
	pending_order,
	expedite_order,
	need_before_next_roq,
	is_pending_order_resolved,
	is_expedite_order_resolved,
	is_need_before_next_roq_resolved,
	is_recom_order_resolved,
	raw_roq_earliest,
    roq_unconstrained_earliest,
    receipt_date_earliest,
    order_placement_date_earliest,
    date_diff,
	order_quantity_earliest
  )
select
	"style",
	article,
	"size",
	product_code,
	loc_code,
	channel,
	vendor_code,
	recom_receipt_date::date,
	next_order_cycle_receipt_date::date,
	historic_sales_unit,
	historic_sales_value,
	lost_sales_aggregated_unit,
	lost_sales_aggregated_value,
	potential_sales_unit,
	potential_sales_value,
	dc_wos_oh_oo_it,
	dc_store_wos_oh_oo_it,
	recom_order,
	pending_order,
	expedite_order,
	need_before_next_roq,
	is_pending_order_resolved,
	is_expedite_order_resolved,
	is_need_before_next_roq_resolved,
	is_recom_order_resolved,
	raw_roq_earliest,
    roq_unconstrained_earliest,
    receipt_date_earliest::date,
    order_placement_date_earliest::date,
    date_diff,
	roq_unconstrained_earliest as order_quantity_earliest
FROM
  public.oms_alerts AS oa
ON CONFLICT do nothing;
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