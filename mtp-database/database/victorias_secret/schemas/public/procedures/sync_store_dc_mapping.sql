--liquibase formatted sql
--changeset kamuju.mahaveer@impactanalytics.co:sync_store_dc_mapping_v1 runOnChange:true stripComments:false splitStatements:false context:VS_Inv_smart labels:VPP-310
--comment: Updated sync_store_dc_mapping for VS
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_store_dc_mapping();
CREATE OR REPLACE PROCEDURE public.sync_store_dc_mapping()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_store_dc_mapping';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		INSERT INTO "global".product_mapping_store_dc (
		  mapping_type, store_code, dc_code, 
		  is_active
		) 
		select 
		  mapping_type, 
		  x.store_code, 
		  dc.dc_code, 
		  x.is_active is_active 
		from 
		  public.store_dc_mapping x 
		  join global.store_master sm using(store_code) 
		  join global.store_master dc on x.dc_code = dc.store_code on conflict(store_code,dc_code)  
		  DO update set is_active =excluded.is_active;
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

