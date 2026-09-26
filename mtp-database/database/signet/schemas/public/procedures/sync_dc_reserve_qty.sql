--liquibase formatted sql
--changeset sri.harsha@impactanalytic.co:sync_dc_reserve_qty runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:MTP-20116
--comment: updated the SP as per user rerserve changes
--comment: Added where condition for ecom and system reserve
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_dc_reserve_qty();
CREATE OR REPLACE PROCEDURE public.sync_dc_reserve_qty()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_dc_reserve_qty';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
  		delete from "inventory_smart".dc_reserve_quantity
  		where type in ('E','S');
  	
  		insert into "global".dc_reserve_quantity_anomaly(product_code,quantity,created_at,"type",dc_code,reservation_till_date,instock_inclusion,updated_by,"comment",deleted_date)
		select product_code,quantity,created_at,"type",dc_code,reservation_till_date,instock_inclusion,updated_by,"comment",current_date as deleted_date 
		from inventory_smart.dc_reserve_quantity drq 
		where "type" ='U' and reservation_till_date < current_date;
	
		update inventory_smart.dc_reserve_quantity 
		set quantity =0,reservation_till_date = null,"comment" = 'RTD Passed'
		where "type" ='U' and reservation_till_date < current_date;
	
	
  		INSERT INTO "inventory_smart".dc_reserve_quantity  (
  		product_code, quantity, type, inventory_source , dc_code 
  		)
  		select x.product_code, x.quantity, x.type,x.inventory_source, dc_code 
  		FROM
  		public.dc_reserve_qty x
  		  left join "global".distribution_centres
  		  on store_code = linked_store_code
		  where type in ('E','S')
  		 ;
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
