    --liquibase formatted sql
    --changeset rohankumar.sinha:marksmart_calendar_date_mapping_version_v3 stripComments:false splitStatements:false context:marksmart_calendar_date_mapping_version
    --comment: initial changeset for marksmart_calendar_date_mapping_version_v3

    
CREATE TABLE IF NOT EXISTS "global".marksmart_calendar_date_mapping_version (
	version_code int4 NOT NULL,
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
	CONSTRAINT tb_calendar_date_mapping_pk PRIMARY KEY (version_code, date)
)
PARTITION BY LIST (version_code);
CREATE INDEX marksmart_calendar_date_mapping_version_l0_id_idx_4 ON global.marksmart_calendar_date_mapping_version USING btree (version_code, date);
