-- liquibase formatted sql
-- changeset vaibhav@impactanalytics.co:pc_refresh_promo_inventory runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_actuals_promo
-- comment: derived table for pc_refresh_promo_inventory

DROP  PROCEDURE if exists public.pc_refresh_promo_inventory();

CREATE OR REPLACE PROCEDURE public.pc_refresh_promo_inventory()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.pc_refresh_promo_inventory';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin

call price_promo_opt.pc_refresh_promo_inventory();

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
