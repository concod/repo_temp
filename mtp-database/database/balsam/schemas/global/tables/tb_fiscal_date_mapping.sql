--liquibase formatted sql
--changeset surya.avinash@impactanalytics.co:tb_fiscal_date_mapping_v290525 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: updated schema for tb_fiscal_date_mapping

CREATE TABLE "global".tb_fiscal_date_mapping (
	date_id date NULL,
	fiscal_year int4 NULL,
	fiscal_quarter int4 NULL,
	fiscal_year_qtr text NULL,
	fiscal_month int4 NULL,
	fiscal_year_month text NULL,
	fiscal_week int4 NULL,
	fiscal_year_week text NULL,
	fiscal_day_week int4 NULL,
	fiscal_week_name text NULL,
	fiscal_season_name int4 NULL,
	fiscal_season_start int4 NULL,
	fiscal_long_date text NULL,
	fiscal_day_name text NULL,
	holiday_event int4 NULL,
	is_holiday_flag int4 NULL,
	is_fed_holiday_flag int4 NULL,
	is_workday_flag int4 NULL,
	month_name text NULL,
	"date" date NOT NULL,
	weeks_start_date date NULL,
	week_end_date date NULL,
	ly_date date NULL,
	lly_date date NULL,
	llly_date date NULL,
	lllly_date date NULL,
	fiscal_day_year int4 NULL,
	fiscal_day_qtr int4 NULL,
	fiscal_day_month int4 NULL,
	fiscal_fd_year date NULL,
	fiscal_ld_year date NULL,
	fiscal_fd_qtr date NULL,
	fiscal_ld_month date NULL,
	fiscal_fd_week date NULL,
	fiscal_ld_week date NULL,
	CONSTRAINT tb_fiscal_date_mapping_pk PRIMARY KEY (date)
);

--changeset anshika.mungiya@impactanalytics.co:tb_fiscal_date_mapping_June6 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: updated schema for tb_fiscal_date_mapping_June6


ALTER TABLE "global".tb_fiscal_date_mapping
DROP CONSTRAINT tb_fiscal_date_mapping_pk;

ALTER TABLE "global".tb_fiscal_date_mapping
ALTER COLUMN fiscal_year_qtr TYPE int4 USING fiscal_year_qtr::int4,
ALTER COLUMN fiscal_year_month TYPE int4 USING fiscal_year_month::int4,
ALTER COLUMN fiscal_year_week TYPE int4 USING fiscal_year_week::int4;

ALTER TABLE "global".tb_fiscal_date_mapping
DROP COLUMN fiscal_week_name,
DROP COLUMN fiscal_season_name,
DROP COLUMN fiscal_season_start,
DROP COLUMN fiscal_long_date,
DROP COLUMN fiscal_day_name,
DROP COLUMN holiday_event,
DROP COLUMN month_name,
DROP COLUMN week_end_date,
DROP COLUMN ly_date,
DROP COLUMN lly_date,
DROP COLUMN llly_date,
DROP COLUMN lllly_date;

ALTER TABLE "global".tb_fiscal_date_mapping
ADD COLUMN fiscal_week_name varchar(50) NULL,
ADD COLUMN fiscal_season_name varchar(50) NULL,
ADD COLUMN fiscal_season_start date NULL,
ADD COLUMN fiscal_long_date varchar(50) NULL,
ADD COLUMN fiscal_day_name varchar(50) NULL,
ADD COLUMN holiday_event varchar(50) NULL,
ADD COLUMN month_name varchar(50) NULL;

ALTER TABLE "global".tb_fiscal_date_mapping
ALTER COLUMN "date" DROP NOT NULL;


--changeset vaibhav@impactanalytics.co:tb_fiscal_date_mapping_June11 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: updated schema for tb_fiscal_date_mapping_June11

ALTER TABLE "global".tb_fiscal_date_mapping
ADD COLUMN  week_end_date date NULL,
ADD COLUMN	ly_date date NULL,
ADD COLUMN	lly_date date NULL,
ADD COLUMN	llly_date date NULL,
ADD COLUMN	lllly_date date NULL;

--changeset harsh.singh@impactanalytics.co:tb_fiscal_date_mapping_pk stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: add primary key constraint to tb_fiscal_date_mapping
ALTER TABLE "global"."tb_fiscal_date_mapping"
    ADD CONSTRAINT tb_fiscal_date_mapping_pk PRIMARY KEY (date_id);