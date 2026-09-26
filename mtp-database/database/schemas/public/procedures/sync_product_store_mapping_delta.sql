--liquibase formatted sql
--changeset laraib.ahmad@impactanalytics.co:sync_product_store_mapping_delta runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-31030
--comment: Updated The SP to set validity as NULL 
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_product_store_mapping_delta();
CREATE OR REPLACE PROCEDURE public.sync_product_store_mapping_delta()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_product_store_mapping_delta';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		call global.build_list_partitions('product_mapping_product_store');
		
		INSERT INTO "global".product_mapping_product_store (
		  mapping_type, l0_name, product_code, store_code, 
		  is_active, validity
		) 
		select 
		  mapping_type, 
		  l0_name, 
		  x.product_code, 
		  store_code, 
		  is_active, 
		  case when is_active = true  then range_agg(
 		    daterange(
 		      validity_start_date, validity_end_date
 		    )
 		  )  else null end  as validity 
		from 
		  public.product_store_mapping_delta x 
		 join global.product_master pm 
		 on x.product_code =pm.product_code 
		where change_type =1
		group by 
		  1, 
		  2, 
		  3, 
		  4, 
		  5
		;
	
	update "global".product_mapping_product_store pmps
	set is_active = dl.is_active,
		validity = dl.validity
	from 	
	 (select 
		  mapping_type, 
		  l0_name, 
		  x.product_code, 
		  store_code, 
		  is_active, 
		  case when is_active = true  then range_agg(
 		    daterange(
 		      validity_start_date, validity_end_date
 		    )
 		  )  else null end  as validity 
		from 
		  public.product_store_mapping_delta x 
		  join global.product_master pm 
		  on x.product_code =pm.product_code 
		where change_type =0
		group by 
		  1, 
		  2, 
		  3, 
		  4, 
		  5
		) dl
		   where pmps.l0_name =dl.l0_name
		   and pmps.product_code =dl.product_code
		   and pmps.store_code =dl.store_code 
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