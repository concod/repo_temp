-- liquibase formatted sql
-- changeset shameel.zeeeshan@impactanalytics.co:sync_backsync_latest_dates runOnChange:true stripComments:false splitStatements:false context:added sp labels:added instock column
-- comment: added instock column  

DROP PROCEDURE if exists public.sync_backsync_latest_dates();

CREATE OR REPLACE PROCEDURE public.sync_backsync_latest_dates()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_backsync_latest_dates';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
 		delete from 
 		  inventory_smart.backsync_latest_dates
 		where 
 		  true;
 		insert into inventory_smart.backsync_latest_dates (gurobi_date,analytics_report_date)
		select gurobi_date,analytics_report_date
		from public.backsync_latest_dates
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