-- liquibase formatted sql
-- changeset kumaran.k@impactanalytics.co:sync_tb_fiscal_date_mapping_v1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_tb_fiscal_date_mapping
-- comment: derived table for sync_tb_fiscal_date_mapping

DROP  PROCEDURE if exists public.sync_tb_fiscal_date_mapping();

CREATE OR REPLACE PROCEDURE public.sync_tb_fiscal_date_mapping()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
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
	        TRUNCATE TABLE  global.tb_fiscal_date_mapping;

	        INSERT INTO global.tb_fiscal_date_mapping
	        (
                date_id,
                fiscal_year,
                fiscal_quarter,
                fiscal_year_qtr,
                fiscal_month,
                fiscal_year_month,
                fiscal_week,
                fiscal_year_week,
                fiscal_day_year,
                fiscal_day_qtr,
                fiscal_day_month,
                fiscal_day_week,
                fiscal_fd_year,
                fiscal_ld_year,
                fiscal_fd_qtr,
                fiscal_ld_qtr,
                fiscal_fd_month,
                fiscal_ld_month,
                fiscal_fd_week,
                fiscal_ld_week,
                fiscal_week_name,
                fiscal_season_name,
                fiscal_season_start,
                fiscal_long_date,
                fiscal_day_name,
                holiday_event,
                is_holiday_flag,
                is_fed_holiday_flag,
                is_workday_flag,
                month_name,
                date,
                weeks_start_date
	        )
			select
                date_id,
                fiscal_year,
                fiscal_quarter,
                fiscal_year_qtr,
                fiscal_month,
                fiscal_year_month,
                fiscal_week,
                fiscal_year_week,
                fiscal_day_year,
                fiscal_day_qtr,
                fiscal_day_month,
                fiscal_day_week,
                fiscal_fd_year,
                fiscal_ld_year,
                fiscal_fd_qtr,
                fiscal_ld_qtr,
                fiscal_fd_month,
                fiscal_ld_month,
                fiscal_fd_week,
                fiscal_ld_week,
                fiscal_week_name,
                fiscal_season_name,
                fiscal_season_start,
                fiscal_long_date,
                fiscal_day_name,
                holiday_event,
                is_holiday_flag,
                is_fed_holiday_flag,
                is_workday_flag,
                month_name,
                date,
                weeks_start_date
			from public.tb_fiscal_date_mapping
		group by 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32;
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