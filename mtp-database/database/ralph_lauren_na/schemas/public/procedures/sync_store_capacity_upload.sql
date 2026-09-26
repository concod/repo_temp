--liquibase formatted sql
--changeset pooja_shekar:sync_store_capacity_for_upload runOnChange:true stripComments:false splitStatements:false context:Ralph_Lauren_InventorySmart labels:MTP-46923
--comment:Initial changeset
--rollback: SELECT 1
DROP procedure IF EXISTS public.sync_store_capacity_upload();
CREATE OR REPLACE PROCEDURE public.sync_store_capacity_upload()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_store_capacity_upload';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
insert into inventory_smart.store_unit_capacity	
		(product_hierarchy,
		store_code,
		unit_capacity,
    updated_at,updated_by,upload_flag)
	select 	product_hierarchy,
		store_code,
		unit_capacity,
		scd.updated_at ,scd.updated_by,
        'true' upload_flag 
		from public.store_capacity_delta scd
		join "global".store_attributes_filter saf 
		using(store_code)
	    on conflict(product_hierarchy ,store_code )
	   do update 
	  set unit_capacity =excluded.unit_capacity,
	 updated_at  = excluded.updated_at,
	updated_by = excluded.updated_by,
    upload_flag = excluded.upload_flag;
   
	delete from inventory_smart.intermediate_capacity_upload 
 		where updated_at  <=
 		(select max(updated_at) from public.store_capacity_delta);
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
	END;
$procedure$
;
