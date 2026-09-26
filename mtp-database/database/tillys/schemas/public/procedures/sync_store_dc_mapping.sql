--liquibase formatted sql
--changeset gauri.nair@impactanalytics.co:sync_store_dc_mapping runOnChange:true stripComments:false splitStatements:false context:Release_11
--comment: adding procedure for sync_store_dc_mapping

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
	    -- upsert query
		INSERT INTO "global".product_mapping_store_dc (
		  mapping_type, store_code, dc_code, 
		  is_active
		) 
		select 
		  x.mapping_type, 
		  x.store_code, 
		  dc.dc_code,
		  --x.dc_code,
		  x.is_active is_active 
		from 
		  public.product_mapping_store_dc x 
		  join global.store_attributes_filter sm using(store_code) 
		  --join global.distribution_centres dc on x.dc_code = dc.linked_store_code
		  join global.distribution_centres dc on x.dc_code = dc.dc_code
          on conflict do nothing;
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