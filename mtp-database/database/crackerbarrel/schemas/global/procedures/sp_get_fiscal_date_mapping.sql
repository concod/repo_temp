--liquibase formatted sql
--changeset liquibase:added sp_get_fiscal_date_mapping runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added sp_get_fiscal_date_mapping
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS "global".sp_get_fiscal_date_mapping();

CREATE OR REPLACE PROCEDURE global.sp_get_fiscal_date_mapping()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
	declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'global.sp_get_fiscal_date_mapping';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    INSERT INTO global.tb_fiscal_date_mapping (
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
        "date",
        weeks_start_date
    )
    SELECT
        date AS date_id,
        fiscal_year,
        fiscal_quarter_in_year,
        fiscal_year_quarter,
        fiscal_month_in_year,
        fiscal_year_month,
        fiscal_week,
        fiscal_year_week,
        fiscal_day_in_year,
        fiscal_day_in_quarter,
        fiscal_day_in_month,
        fiscal_day_in_week,
        fiscal_year_begin_date AS fiscal_fd_year,
        fiscal_year_end_date AS fiscal_ld_year,
        fiscal_quarter_begin_date AS fiscal_fd_qtr,
        fiscal_quarter_end_date AS fiscal_ld_qtr,
        fiscal_month_begin_date AS fiscal_fd_month,
        fiscal_month_end_date AS fiscal_ld_month,
        fiscal_week_begin_date AS fiscal_fd_week,
        fiscal_week_end_date AS fiscal_ld_week,
        fiscal_quarter_name,
        fiscal_season_name,
        fiscal_season_begin_date,
        TO_CHAR(date, 'Mon DD YYYY') AS fiscal_long_date,
        fiscal_day_name,
        holiday, -- holiday_event
        NULL,    -- is_holiday_flag (no direct mapping)
        NULL,    -- is_fed_holiday_flag (no direct mapping)
        NULL,    -- is_workday_flag (no direct mapping)
        fiscal_month_name,
        date,
        fiscal_week_begin_date AS weeks_start_date
    FROM global.fiscal_date_mapping;
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