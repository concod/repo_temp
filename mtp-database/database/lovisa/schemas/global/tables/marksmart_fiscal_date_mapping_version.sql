    --liquibase formatted sql
    --changeset rohankumar.sinha:marksmart_fiscal_date_mapping_version_v2 stripComments:false splitStatements:false context:marksmart_fiscal_date_mapping_version
    --comment: initial changeset for marksmart_fiscal_date_mapping_version_v2

CREATE TABLE IF NOT EXISTS "global".marksmart_fiscal_date_mapping_version (
	version_code int4 NOT NULL,
	date_id date NOT NULL,
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
	holiday_event varchar(100) NULL,
	is_holiday_flag int4 NULL,
	is_fed_holiday_flag int4 NULL,
	is_workday_flag int4 NULL,
	month_name varchar(50) NULL,
	"date" date NOT NULL,
	weeks_start_date date NULL,
	week_end_date date NULL,
	ly_date date NULL,
	lly_date date NULL,
	llly_date date NULL,
	lllly_date date NULL,
	CONSTRAINT tb_fiscal_date_mapping_pk_2 PRIMARY KEY (version_code, date)
)
PARTITION BY LIST (version_code);
CREATE INDEX marksmart_fiscal_date_mapping_l0_id_idx_4 ON global.marksmart_fiscal_date_mapping_version USING btree (version_code, date);
