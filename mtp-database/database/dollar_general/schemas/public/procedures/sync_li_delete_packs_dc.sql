--liquibase formatted sql
--changeset rajat.choudhary-2:sync_latest_inventory_v3 runOnChange:true stripComments:false splitStatements:false context:ASync_Procedures labels:001
--comment: consider pack type id instead of product code
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_li_delete_packs_dc();
CREATE OR REPLACE PROCEDURE public.sync_li_delete_packs_dc()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_li_delete_packs_dc';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		
	DELETE FROM inventory_smart.latest_inventory
	WHERE CONCAT(product_code, '_', dc_code) in 
	(SELECT CONCAT(pack_type_id, '_', dc_code) FROM inventory_smart.dc_pack_inventory);
		
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
	end;
$procedure$
;

