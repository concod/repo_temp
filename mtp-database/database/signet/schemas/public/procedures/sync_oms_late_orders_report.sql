--liquibase formatted sql
--changeset liquibase:sync_oms_late_orders_report runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_oms_late_orders_report
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS sync_oms_late_orders_report(IN _is_historic boolean);
CREATE OR REPLACE PROCEDURE public.sync_oms_late_orders_report(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_oms_late_orders_report';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	if _is_historic then 
            delete from 
              inventory_smart.oms_late_orders_report 
            where 
              true;
        end if;
       
    INSERT INTO inventory_smart.oms_late_orders_report
	(product_code, 
	po_id, 
	order_date, 
	not_before_date, 
	not_after_date, 
	total_order_qty,
	total_received_qty,
	variance_unit,
	four_week_open_qty,
	total_order_qty_cost,
	total_received_qty_cost,
	variance_unit_cost,
	four_week_open_qty_cost)
	
	SELECT product_code, 
	po_id, 
	order_date::date, 
	not_before_date::date, 
	not_after_date::date, 
	total_order_qty,
	total_received_qty,
	variance_unit,
	coalesce(four_week_open_qty,0) as four_week_open_qty,
	total_order_qty_cost,
	total_received_qty_cost,
	variance_unit_cost,
	coalesce(four_week_open_qty_cost,0) as four_week_open_qty_cost
	FROM public.oms_late_orders_report;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
	END;
$procedure$
;
;
