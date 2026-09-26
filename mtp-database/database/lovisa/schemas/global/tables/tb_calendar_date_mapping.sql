--liquibase formatted sql
--changeset swapnil.bhange@impactanalytics.co:tb_calendar_date_mapping_3 stripComments:false splitStatements:false context:Release_1_0 labels:tb_calendar_date_mapping_3
--comment: initial changeset for tb_calendar_date_mapping_3


CREATE TABLE IF NOT EXISTS "global".tb_calendar_date_mapping (
	date_id date NULL,
	"year" int4 NULL,
	quarter int4 NULL,
	year_qtr_id int4 NULL,
	"month" int4 NULL,
	year_month_id int4 NULL,
	week int4 NULL,
	year_week_id int4 NULL,
	day_of_year int4 NULL,
	day_of_month int4 NULL,
	day_of_week int4 NULL,
	day_of_quarter int4 NULL,
	season varchar(50) NULL,
	long_date varchar(50) NULL,
	day_name varchar(50) NULL,
	holiday_event varchar(50) NULL,
	is_holiday_flag int4 NULL,
	is_fed_holiday_flag int4 NULL,
	is_workday_flag int4 NULL,
	month_name varchar(50) NULL,
	"date" date NOT NULL,
	CONSTRAINT tb_calendar_date_mapping_pk_3 PRIMARY KEY ("date")
);

