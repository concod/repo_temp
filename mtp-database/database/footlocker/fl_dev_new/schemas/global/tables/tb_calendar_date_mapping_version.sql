--liquibase formatted sql
--changeset sriraj.varanasi@impactanalytics.co:tb_calendar_date_mapping_version  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_calendar_date_mapping_version

CREATE TABLE IF NOT EXISTS "global".tb_calendar_date_mapping_version (
	date_id date NULL,
	"year" int4 NULL,
	quarter int4 NULL,
	year_qtr_id int4 NULL,
	"month" int4 NULL,
	year_month_id int4 NULL,
	week int4 NULL,
	year_week_id int4 NULL,
	day_of_year int4 NULL,
	day_of_quarter int4 NULL,
	day_of_month int4 NULL,
	day_of_week int4 NULL,
	season varchar(50) NULL,
	long_date varchar(50) NULL,
	day_name varchar(50) NULL,
	holiday_event varchar(50) NULL,
	is_holiday_flag int4 NULL,
	is_fed_holiday_flag int4 NULL,
	is_workday_flag int4 NULL,
	month_name varchar(50) NULL,
	"date" date NOT NULL,
	version_code int4 NOT NULL,
	CONSTRAINT pk_calendar_mapping PRIMARY KEY (version_code, date)
)
PARTITION BY LIST (version_code);

--changeset siddharth.bajpai@impactanalytics.co:fix_tb_calendar_date_mapping_version_pk_20251216 stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:tb_calendar_date_mapping
--comment: Fix primary key order to match dev DB

ALTER TABLE "global".tb_calendar_date_mapping_version DROP CONSTRAINT IF EXISTS pk_calendar_mapping CASCADE;
ALTER TABLE "global".tb_calendar_date_mapping_version ADD CONSTRAINT pk_calendar_mapping PRIMARY KEY (date, version_code);