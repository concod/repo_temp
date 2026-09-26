--liquibase formatted sql
--changeset sri.harsha:sync_instock_inclusion runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-20351
--comment: initial changeset for sync_instock_inclusion
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_instock_inclusion();
CREATE OR REPLACE PROCEDURE public.sync_instock_inclusion()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_instock_inclusion';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
  		delete from "inventory_smart".instock_inclusion
  		where true;
	
  		INSERT INTO "inventory_smart".instock_inclusion  (
  		product_code, instock_inclusion 
  		)
  		select x.product_code, x.instock_inclusion
  		FROM
  		"inventory_smart".dc_reserve_quantity x
  		where instock_inclusion is true 
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
