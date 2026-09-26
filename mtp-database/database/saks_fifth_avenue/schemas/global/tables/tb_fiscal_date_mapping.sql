--liquibase formatted sql
--changeset liquibase:tb_fiscal_date_mapping_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_fiscal_date_mapping with additional scripts for new approach for MV
CREATE TABLE "global"."tb_fiscal_date_mapping" (
    date_id date NULL,
    fiscal_year int4 NULL,
    fiscal_quarter int4 NULL,
    fiscal_year_qtr int4 NULL,
    fiscal_month int4 NULL,
    fiscal_year_month int4 NULL,
    fiscal_week int4 NULL,
    fiscal_year_week int4 NULL,
    fiscal_day_year int4 NULL,
    fiscal_day_qtr int4 NULL,
    fiscal_day_month int4 NULL,
    fiscal_day_week int4 NULL,
    fiscal_FD_year date NULL,
    fiscal_LD_year date NULL,
    fiscal_FD_qtr date NULL,
    fiscal_LD_qtr date NULL,
    fiscal_FD_month date NULL,
    fiscal_LD_month date NULL,
    fiscal_FD_week date NULL,
    fiscal_LD_week date NULL,
    fiscal_week_name varchar(50) NULL,
    fiscal_season_name varchar(50) NULL,
    fiscal_season_start date NULL,
    fiscal_long_date varchar(50) NULL,
    fiscal_day_name varchar(50) NULL,
    holiday_event varchar(50) NULL,
    is_holiday_flag int4 NULL,
    is_fed_holiday_flag int4 NULL,
    is_workday_flag int4 NULL,
    month_name varchar(50) NULL,
    date date NULL
)
;

--changeset liquibase:kumaran_2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_fiscal_date_mapping with additional scripts for new columns
ALTER TABLE "global".tb_fiscal_date_mapping ADD COLUMN weeks_start_date date;