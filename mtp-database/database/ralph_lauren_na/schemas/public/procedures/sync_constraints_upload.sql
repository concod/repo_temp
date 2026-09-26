--liquibase formatted sql
--changeset praharsh_snehi:sync_constraints_for_upload_upload_flag_v2 runOnChange:true stripComments:false splitStatements:false context:Ralph_Lauren_InventorySmart labels:MTP-36168
--comment: upload_flag handling
--rollback: SELECT 1
DROP procedure IF EXISTS public.sync_constraints_upload();
CREATE OR REPLACE PROCEDURE public.sync_constraints_upload()
	LANGUAGE plpgsql
	SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_constraints_upload';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
			INSERT INTO inventory_smart.constraint_master (
		  mapping_code, l0_name, channel, product_code, 
		  store_code, wos, transit_time, safety_stock, 
		  min_stock, max_stock, aps, ros,updated_by,updated_at,upload_flag
		) 
		SELECT 
 		  pmps.mapping_code, 
 		  paf.l0_name,
 		  saf.channel, 
 		  x.product_code, 
 		  x.store_code, 
 		  x.wos, 
 		  x.transit_time, 
 		  x.safety_stock, 
 		  coalesce(x.min_stock, 0) as min_stock, 
 		  coalesce(x.max_stock, 0) as max_stock, 
 		  x.aps, 
 		  x.ros,
 		  x.created_by,
 		  x.updated_at,
		  'true'
 		  FROM 
 		  public.constraints_delta x 
 		  join "global".product_attributes_filter paf on x.product_code= paf.product_code
 		  join "global".store_attributes_filter saf on x.store_code= saf.store_code
 		  join global.product_mapping_product_store pmps
 		  on x.product_code = pmps.product_code
 		  and x.store_code = pmps.store_code 
 		  on conflict(mapping_code,l0_name) 
 		  do update 
 		  set min_stock = excluded.min_stock,
 		  max_stock=excluded.max_stock,
 		  wos = excluded.wos, 
 		  updated_by=excluded.updated_by,
 		  updated_at = excluded.updated_at,
		  upload_flag=excluded.upload_flag	  
 		  
 		  ;
 		 
 		delete from inventory_smart.intermediate_constraint_upload 
 		where updated_at  <= 
 		(select max(updated_at) from public.constraints_delta);

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
