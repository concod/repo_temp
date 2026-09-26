--liquibase formatted sql
--changeset liquibase:sync_store_stock_drilldown runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_store_stock_drilldown
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_store_stock_drilldown();
CREATE OR REPLACE PROCEDURE public.sync_store_stock_drilldown()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_store_stock_drilldown';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		delete from 
		  inventory_smart.store_stock_drilldown;
		INSERT INTO inventory_smart.store_stock_drilldown (
		  product_code, store_code, "date", 
		  store_avail_oh, store_in_transit, 
		  dc_oh, model_stock, min, max, wos, 
		  po_oo_next_30_days_store, po_oo_next_60_days_store, 
		  po_oo_next_90_days_store, po_oo_next_30_days_dc, 
		  po_oo_next_60_days_dc, po_oo_next_90_days_dc
		) 
		SELECT 
		  product_code, 
		  store_code, 
		  "date", 
		  store_avail_oh, 
		  store_in_transit, 
		  store_avail_oh_dc as dc_oh, 
		  model_stock, 
		  min, 
		  max, 
		  wos, 
		  po_oo_next_30_days_store, 
		  po_oo_next_60_days_store, 
		  po_oo_next_90_days_store, 
		  po_oo_next_30_days_dc, 
		  po_oo_next_60_days_dc, 
		  po_oo_next_90_days_dc 
		FROM 
		  public.store_stock_drilldown;
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
