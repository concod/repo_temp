-- liquibase formatted sql
-- changeset kumaran.k@impactanalytics.co:sync_calendar_date_mapping_v5 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_calendar_date_mapping
-- comment: derived table for calendar_date_mapping_v5

DROP  PROCEDURE if exists public.sync_calendar_date_mapping();

CREATE OR REPLACE PROCEDURE public.sync_calendar_date_mapping()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_calendar_date_mapping';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	        TRUNCATE TABLE global.tb_calendar_date_mapping;

	        INSERT INTO global.tb_calendar_date_mapping
	        (
              date_id,
              year,
              quarter,
              year_qtr_id,
              month,
              year_month_id,
              week,
              year_week_id,
              day_of_year,
              day_of_quarter,
              day_of_month,
              day_of_week,
              season,
              long_date,
              day_name,
              holiday_event,
              is_holiday_flag,
              is_fed_holiday_flag,
              is_workday_flag,
              month_name,
              date
	        )
			select
              cast(date_id as date) as date_id,
              cast(year as int4) as year,
              cast(quarter as int4) as quarter,
              cast(year_qtr_id as int4) as year_qtr_id,
              cast(month as int4) as month,
              cast(year_month_id as int4) as year_month_id,
              cast(week as int4) as week,
              cast(year_week_id as int4) as year_week_id,
              cast(day_of_year as int4) as day_of_year,
              cast(day_of_quarter as int4) as day_of_quarter,
              cast(day_of_month as int4) as day_of_month,
              cast(day_of_week as int4) as day_of_week,
              season,
              long_date,
              day_name,
              holiday_event,
              cast(is_holiday_flag as int4) as is_holiday_flag,
              cast(is_fed_holiday_flag as int4) as is_fed_holiday_flag,
              cast(is_workday_flag as int4) as is_workday_flag,
              month_name,
              cast(date as date) as date
			from public.calendar_date_mapping
			group by 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21
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