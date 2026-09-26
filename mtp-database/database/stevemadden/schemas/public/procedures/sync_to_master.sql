--liquibase formatted sql
--changeset liquibase:sync_to_master runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_to_master
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_to_master();
CREATE OR REPLACE PROCEDURE public.sync_to_master()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_to_master';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		delete from 
		  inventory_smart.to_master 
		where 
		  true;
		INSERT INTO inventory_smart.to_master (
		  product_code, line_status, line_status_description, 
		  header_status, header_status_description, 
		  allocation_order, invent_site_id_from, 
		  invent_location_id_from, wms_location_id_from, 
		  invent_site_id_to, invent_location_id_to, 
		  wms_location_id_to, quantity_transferred, 
		  quantity_received, quantity_remain_received, 
		  quantity_shipped, quantity_remain_shipped, 
		  "date", shipping_date, receipt_date, 
		  allocation_user, sales_category, 
		  inventory_status_id_from, inventory_status_id_to, 
		  allocation_code, to_code, to_id, 
		  line_num, invent_trans_id
		) 
		SELECT 
		  product_code, 
		  line_status, 
		  line_status_description, 
		  header_status, 
		  header_status_description, 
		  allocation_order, 
		  inventsiteidfrom, 
		  inventlocationidfrom, 
		  wmslocationidfrom, 
		  inventsiteidto, 
		  inventlocationidto, 
		  wmslocationidto, 
		  quantity_transferred, 
		  quantity_received, 
		  quantity_remain_received, 
		  quantity_shipped, 
		  quantity_remain_shipped, 
		  "date", 
		  shipping_date, 
		  receipt_date, 
		  allocation_user, 
		  sales_category, 
		  inventorystatusidfrom, 
		  inventorystatusidto, 
		  allocation_code, 
		  to_code, 
		  to_id, 
		  line_num, 
		  inventtransid 
		FROM 
		  public.to_latest;
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
