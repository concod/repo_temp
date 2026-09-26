--liquibase formatted sql
--changeset liquibase:sync_product_dc_mapping runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_product_dc_mapping
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_product_dc_mapping();
CREATE OR REPLACE PROCEDURE public.sync_product_dc_mapping()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_product_dc_mapping';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		insert into global.product_mapping_product_dc(
		  mapping_type, product_code, dc_code, 
		  is_active
		) 
		select 
		  mapping_type, 
		  product_code, 
		  dc_code, 
		  x.is_active 
		from 
		  public.product_dc_mapping x 
		  join global.distribution_centres dc on x.store_code = dc.linked_store_code 
		where 
		  dc.is_active on conflict(product_code, dc_code) do 
		update 
		set 
		  is_active = excluded.is_active;
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
