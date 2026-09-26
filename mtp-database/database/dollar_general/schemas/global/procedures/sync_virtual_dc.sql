--liquibase formatted sql
--changeset swapnil.bhange:sync_virtual_dc_v2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_virtual_dc_v2
--comment: added is_deleted condition for sync_virtual_dc
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS global.sync_virtual_dc();
CREATE OR REPLACE PROCEDURE global.sync_virtual_dc()
 LANGUAGE plpgsql
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'global.sync_virtual_dc';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
 INSERT INTO "global".distribution_centres (
		  dc_code, name, is_active, is_deleted, linked_store_code, is_virtual) 
		select 
		  dc_code, name, is_active, not is_active as is_deleted, linked_store_code,true
		from 
		  public.reserve_virtual_dc  
		  on conflict(dc_code) do 
		update 
		set 
		  is_active = excluded.is_active, 
		  is_deleted = not excluded.is_active,
		  is_virtual= true;
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