--liquibase formatted sql
--changeset aman.lakkoju:sync_new_store_data runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_new_store_data
--rollback: SELECT 1

DROP PROCEDURE if exists public.sync_new_store_data();
CREATE OR REPLACE PROCEDURE public.sync_new_store_data()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_new_store_data';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
 		delete from
 		  global.new_store_data
 		where
 		  true;
 		INSERT INTO global.new_store_data  (
 		  store_code, store_name
 		)
 		SELECT
 		  x.store_code,
 		  x.store_name
 		FROM
 		  public.new_store_data x;
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
