--liquibase formatted sql
--changeset kamuju.mahaveer@impactanalytics.co runOnChange:true stripComments:false splitStatements:false context:VS_Inv_Smart labels:VPP-310
--comment: Initial changeset for sync_product_store_attributes_filter_store_code
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_product_store_attributes_filter_store_code();
CREATE OR REPLACE PROCEDURE public.sync_product_store_attributes_filter_store_code()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_product_store_attributes_filter_store_code';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	 	delete from "global".product_store_attributes_filter_store_code
	 	where true;
	 
 		INSERT INTO "global".product_store_attributes_filter_store_code(
 		psa_code,
        l0_name,
 		store_code,
 		psa_name
 		)
 		SELECT 
 		psa_code,
        l0_name,
 		store_code,
 		psa_name
 		FROM 
 		  public.product_store_attributes_filter_store_code x 
 		  on conflict do nothing
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
