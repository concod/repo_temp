-- liquibase formatted sql
-- changeset zakia.firdous@impactanalytics.co:sync_oms_approved_orders_cb_uat runOnChange:true stripComments:false splitStatements:false context:Release_1.1 labels:sync_oms_constraints_status
-- comment: initial changeset for sync_oms_approved_orders for cb uat new change added


DROP PROCEDURE if exists public.sync_oms_approved_orders(bool);

CREATE OR REPLACE PROCEDURE public.sync_oms_approved_orders(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_oms_approved_orders';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
        DELETE FROM inventory_smart.oms_orders_approved
        WHERE CONCAT(product_code,order_placement_date,order_placement_recom_date,order_type,order_gen_type) IN
        (
            SELECT DISTINCT CONCAT(product_code,order_placement_date,order_placement_recom_date,order_type,order_gen_type)
            FROM 
            (
                SELECT 
                    oclt.po_to_order_processing, (current_date::DATE - order_placement_date::DATE) as days_since_approved,ooa.*
                FROM inventory_smart.oms_orders_approved ooa 
                JOIN inventory_smart.oms_constraints_lead_time oclt 
                    USING(article)
            )AS base
            WHERE days_since_approved>po_to_order_processing
        );
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
