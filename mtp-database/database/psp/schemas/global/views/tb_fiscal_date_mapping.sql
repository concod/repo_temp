--liquibase formatted sql
--changeset liquibase:tb_fiscal_date_mapping_2 runAlways:true stripComments:false splitStatements:false context:tb_fiscal_date_mapping labels:tb_fiscal_date_mapping
--comment: tb_fiscal_date_mapping_2
--rollback: SELECT 1
DROP VIEW IF EXISTS "global".tb_fiscal_date_mapping;
CREATE OR REPLACE VIEW "global".tb_fiscal_date_mapping
AS SELECT t1.date_id,
    t1.fiscal_year,
    t1.fiscal_quarter,
    t1.fiscal_year_qtr,
    t1.fiscal_month,
    t1.fiscal_year_month,
    t1.fiscal_week,
    t1.fiscal_year_week,
    t1.fiscal_day_year,
    t1.fiscal_day_qtr,
    t1.fiscal_day_month,
    t1.fiscal_day_week,
    t1.fiscal_fd_year,
    t1.fiscal_ld_year,
    t1.fiscal_fd_qtr,
    t1.fiscal_ld_qtr,
    t1.fiscal_fd_month,
    t1.fiscal_ld_month,
    t1.fiscal_fd_week,
    t1.fiscal_ld_week,
    t1.fiscal_week_name,
    t1.fiscal_season_name,
    t1.fiscal_season_start,
    t1.fiscal_long_date,
    t1.fiscal_day_name,
    t1.holiday_event,
    t1.is_holiday_flag,
    t1.is_fed_holiday_flag,
    t1.is_workday_flag,
    t1.month_name,
    t1.date,
    t1.simulation_week_start_date,
    t1.version_code,
    t1.ly_date,
    t1.lly_date,
    t1.lw_date,
    t1.simulation_week_start_date AS weeks_start_date
   FROM global.tb_fiscal_date_mapping_version t1
  WHERE t1.version_code = global.get_table_version('global.tb_fiscal_date_mapping_version'::text);