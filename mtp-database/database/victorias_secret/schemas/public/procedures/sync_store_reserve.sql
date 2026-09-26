--liquibase formatted sql
--changeset anujkumar.singh@impactanalytics.co:sync_store_reserve_v2 runOnChange:true stripComments:false splitStatements:false context:Victorias_secret_inventory_smart labels:VPP-321
--comment: Updaing SP to do the full replace
--rollback: SELECT 1
DROP procedure IF EXISTS public.sync_store_reserve();
CREATE OR REPLACE PROCEDURE public.sync_store_reserve()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_store_reserve';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	 	delete from inventory_smart.store_reserve
	 	where true;
	 
 		INSERT INTO inventory_smart.store_reserve(
 		product_code,
 		store_code,
		store_tier,
 		choice,
 		initial_oh,
 		oh,
 		it,
 		oo,
		wip,
 		rfid_delta,
 		epc_units,
 		store_reserve,
 		net_available,
 		reservation_start_date,
 		reservation_end_date,
 		last_updated_by,
 		purpose
 		)
 		SELECT 
 		product_code,
 		store_code,
		store_tier,
 		choice,
 		initial_oh,
 		oh,
 		it,
 		oo,
		wip,
 		rfid_delta,
 		epc_units,
 		store_reserve,
 		net_available,
 		reservation_start_date,
 		reservation_end_date,
 		last_updated_by,
 		purpose
 		FROM 
 		  public.store_reserve_derived x 
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
