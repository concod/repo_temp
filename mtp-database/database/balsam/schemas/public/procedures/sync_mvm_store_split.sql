-- liquibase formatted sql
-- changeset kumaran.k@impactanalytics.co:sync_mvm_store_split_v5 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_mvm_store_split
-- comment: derived table for sync_mvm_store_split_v5

DROP  PROCEDURE if exists public.sync_mvm_store_split();

CREATE OR REPLACE PROCEDURE public.sync_mvm_store_split()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_mvm_store_split';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin

    call price_markdown_opt.pc_refresh_materialized_view_store_split();
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