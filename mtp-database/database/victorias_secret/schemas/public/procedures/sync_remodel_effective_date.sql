--liquibase formatted sql
--changeset kamuju.mahaveer@impactanalytics.co:sync_remodel_effective_date_v1 runOnChange:true stripComments:false splitStatements:false context:VS_inv_smart labels:VS-493
--comment: initial changeset for sync_remodel_effective_date
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_remodel_effective_date();
CREATE OR REPLACE PROCEDURE public.sync_remodel_effective_date()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_remodel_effective_date';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
 		delete from
 		  global.remodel_effective_date
 		where
 		  true;
 		INSERT INTO global.remodel_effective_date  (
 		  store_code, temp_store_effective_date,remodel_store_effective_date,temp_store_code
 		)
 		select legacy_store_code as store_code,temp_store_effective_date,remodel_store_effective_date,CONCAT(legacy_store_code, '_R') as temp_store_code
 		from "global".real_estate_master;
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

