--liquibase formatted sql
--changeset liquibase:sync_oms_pending_order_alerts runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_oms_pending_order_alerts
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_oms_pending_order_alerts(IN _is_historic boolean);
CREATE OR REPLACE PROCEDURE public.sync_oms_pending_order_alerts(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_oms_pending_order_alerts';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
  if _is_historic then 
            delete from 
              inventory_smart.oms_alerts_sku_loc_vendor 
            where 
              true;
        end if;
  UPDATE inventory_smart.oms_alerts_sku_loc_vendor oaslv
  SET pending_order = true, is_pending_order_resolved = false
  FROM inventory_smart.oms_orders_recommended oor
  WHERE oaslv.product_code = oor.product_code
  AND oaslv.loc_code = oor.loc_code
  AND oaslv.vendor_code = oor.vendor_code
  and oor.order_status_id in (1,2,-1);
 
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
