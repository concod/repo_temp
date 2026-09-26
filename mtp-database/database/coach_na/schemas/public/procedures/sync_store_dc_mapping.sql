--liquibase formatted sql
--changeset hemantkumar.bajaj@impactanalytics.co:sync_store_dc_mapping runOnChange:true stripComments:false splitStatements:false context:sync_store_dc_mapping labels:first commit
--comment: sync_store_dc_mapping
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
		INSERT INTO "global".product_mapping (
		  mapping_type, store_code, dc_code, 
		  is_active,product_code,fc_code,created_by, updated_by,created_at,updated_at,vendor,validity
		) 
		select 
		  'store_dc' as mapping_type, 
		  x.store_code, 
		  dc.dc_code, 
		   x.is_active,
		   NULL AS product_code,
    NULL AS fc_code,           
    null as created_by,
    null as updated_by,
    null as created_at,
    null as updated_at,
    null as vendor,
    '{[2025-02-27,9999-12-31)}'::datemultirange AS validity
		from 
		  public.store_dc_mapping_temp x 
		  join global.store_attributes_filter  sm using(store_code) 
		  join global.store_master dc on x.dc_code = dc.dc_code on conflict DO nothing;
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
