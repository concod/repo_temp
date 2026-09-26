-- liquibase formatted sql
-- changeset shrinidhi.choragi@impactanalytics.co:sync_store_dc_mapping runOnChange:true stripComments:false splitStatements:false context:Release_1.1 labels:sync_store_dc_mapping
-- comment: initial changeset for sync_store_dc_mapping

DROP PROCEDURE if exists public.sync_store_dc_mapping();

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
		  case when is_active = 'active' then true else false end
		from 
		  public.store_dc_mapping_delta x 
		  join global.store_master sm using(store_code) 
		  join global.store_master dc on x.dc_code = dc.store_code 
		  where x.dc_code is not null
		  on conflict DO nothing;
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
