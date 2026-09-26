-- liquibase formatted sql
-- changeset abhishek.verma@impactanalytics.co:sync_tb_fiscal_date_mapping runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_tb_fiscal_date_mapping
-- comment: derived table for tb_fiscal_date_mapping

DROP PROCEDURE IF EXISTS public.sync_tb_fiscal_date_mapping;

create or replace procedure public.sync_tb_fiscal_date_mapping()
language plpgsql
security definer
as $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_tb_fiscal_date_mapping';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	
    TRUNCATE TABLE global.tb_fiscal_date_mapping;
    
	insert into global.tb_fiscal_date_mapping
	(date_id, fiscal_year, fiscal_quarter, fiscal_year_qtr, fiscal_month, 
	fiscal_year_month, fiscal_week, fiscal_year_week, fiscal_day_week, fiscal_week_name, 	
	fiscal_season_name, fiscal_season_start, fiscal_long_date, fiscal_day_name, holiday_event, 
	is_holiday_flag, is_fed_holiday_flag, is_workday_flag, month_name, "date", weeks_start_date, 
	week_end_date, ly_date, lly_date, llly_date, lllly_date, fiscal_day_year, fiscal_day_qtr, 
	fiscal_day_month, fiscal_fd_year, fiscal_ld_year, fiscal_fd_qtr, fiscal_ld_qtr, fiscal_fd_month, 
	fiscal_ld_month, fiscal_fd_week, fiscal_ld_week
)
	select 
	date_id, fiscal_year, fiscal_quarter, fiscal_year_qtr, fiscal_month, 
	fiscal_year_month, fiscal_week, fiscal_year_week, fiscal_day_week, fiscal_week_name, 	
	fiscal_season_name, fiscal_season_start, fiscal_long_date, fiscal_day_name, holiday_event, 
	is_holiday_flag, is_fed_holiday_flag, is_workday_flag, month_name, "date", weeks_start_date, 
	week_end_date, ly_date, lly_date, llly_date, lllly_date, fiscal_day_year, fiscal_day_qtr, 
	fiscal_day_month, fiscal_fd_year, fiscal_ld_year, fiscal_fd_qtr, fiscal_ld_qtr, fiscal_fd_month, 
	fiscal_ld_month, fiscal_fd_week, fiscal_ld_week
	from public.fiscal_calendar;
	
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
end;
$procedure$;