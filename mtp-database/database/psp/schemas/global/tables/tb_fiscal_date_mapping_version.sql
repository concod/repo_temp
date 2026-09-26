--liquibase formatted sql
--changeset sriraj.varanasi@impactanalytics.co:tb_fiscal_date_mapping_version  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_fiscal_date_mapping_version

CREATE TABLE IF NOT EXISTS "global".tb_fiscal_date_mapping_version (
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
	fiscal_fd_year date NULL,
	fiscal_ld_year date NULL,
	fiscal_fd_qtr date NULL,
	fiscal_ld_qtr date NULL,
	fiscal_fd_month date NULL,
	fiscal_ld_month date NULL,
	fiscal_fd_week date NULL,
	fiscal_ld_week date NULL,
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
	"date" date NOT NULL,
	simulation_week_start_date date NULL,
	version_code int4 NOT NULL,
	CONSTRAINT pk_fiscal_date_mapping PRIMARY KEY (version_code, date)
)
PARTITION BY LIST (version_code);

--changeset sriraj.varanasi@impactanalytics.co:added_3columns stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:tb_fiscal_date_mapping_version
--comment: 3 columns added 
ALTER TABLE "global".tb_fiscal_date_mapping_version ADD COLUMN IF NOT EXISTS ly_date date NULL;
ALTER TABLE "global".tb_fiscal_date_mapping_version ADD COLUMN IF NOT EXISTS lly_date date NULL;
ALTER TABLE "global".tb_fiscal_date_mapping_version ADD COLUMN IF NOT EXISTS lw_date date NULL;