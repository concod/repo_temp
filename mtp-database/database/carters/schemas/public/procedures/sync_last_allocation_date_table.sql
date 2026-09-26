-- liquibase formatted sql
-- changeset shameel.zeeeshan@impactanalytics.co:sync_last_allocation_date_table runOnChange:true stripComments:false splitStatements:false context:added sp labels:added sync_last_allocation_date_table table
-- comment: added sync_last_allocation_date_table table  

DROP PROCEDURE if exists public.sync_last_allocation_date_table();

CREATE OR REPLACE PROCEDURE public.sync_last_allocation_date_table()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_last_allocation_date_table';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
 		delete from 
 		  inventory_smart.last_allocation_date_table
 		where 
 		  true;
 		insert into inventory_smart.last_allocation_date_table (article ,last_allocation_date)
		select article,
		last_allocation_date
		from public.last_allocation_date_table
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