--liquibase formatted sql
--changeset pranshu.pandey@impactanalytics.co:tb_calendar_date_mapping_consolidated runAlways:true stripComments:false splitStatements:false context:Release_1_0 labels:tb_calendar_date_mapping
--comment: consolidated changeset for tb_calendar_date_mapping view
--rollback: SELECT 1

DROP VIEW IF EXISTS "pricesmart".tb_calendar_date_mapping;
CREATE OR REPLACE VIEW "pricesmart".tb_calendar_date_mapping
AS SELECT t1.date_id,
    t1.year,
    t1.quarter,
    t1.year_qtr_id,
    t1.month,
    t1.year_month_id,
    t1.week,
    t1.year_week_id,
    t1.day_of_year,
    t1.day_of_quarter,
    t1.day_of_month,
    t1.day_of_week,
    t1.season,
    t1.long_date,
    t1.day_name,
    t1.holiday_event,
    t1.is_holiday_flag,
    t1.is_fed_holiday_flag,
    t1.is_workday_flag,
    t1.month_name,
    t1.date,
    t1.version_code
   FROM pricesmart.tb_calendar_date_mapping_version t1
  WHERE t1.version_code = global.get_table_version('pricesmart.tb_calendar_date_mapping_version'::text);