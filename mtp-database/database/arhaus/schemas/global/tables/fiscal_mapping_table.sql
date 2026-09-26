--liquibase formatted sql
--changeset hari.krishna@impactanalytics.co:alerts stripComments:false splitStatements:false context:Release_1_0 labels:alerts_initial_commit
--comment: initial changeset for alerts
CREATE TABLE "global".fiscal_mapping_table (
	fiscal_year_week int4 NULL,
	fiscal_day_in_month int4 NULL,
	fiscal_week_begin_date varchar(50) NULL,
	calendar_date varchar(50) NULL,
	fiscal_day_in_week int4 NULL,
	fiscal_prior_year_comp_week int4 NULL,
	fiscal_month_begin_date varchar(50) NULL,
	fiscal_quarter_name varchar(50) NULL,
	fiscal_day int4 NULL,
	fiscal_week_in_month int4 NULL,
	fiscal_quarter_name_abb varchar(50) NULL,
	fiscal_quarter_end_date varchar(50) NULL,
	fiscal_year_quarter int4 NULL,
	fiscal_year_end_date varchar(50) NULL,
	fiscal_week_in_quarter int4 NULL,
	date_id int4 NULL,
	fiscal_week_in_season int4 NULL,
	fiscal_year_week_prior int4 NULL,
	fiscal_year_week_2wa int4 NULL,
	fiscal_day_name varchar(50) NULL,
	fiscal_day_in_year int4 NULL,
	fiscal_day_name_abb varchar(50) NULL,
	fiscal_year_week_3wa int4 NULL,
	fiscal_month_in_quarter int4 NULL,
	fiscal_month int4 NULL,
	fiscal_quarter int4 NULL,
	fiscal_year int4 NULL,
	"date" varchar(50) NULL,
	fiscal_month_in_season int4 NULL,
	fiscal_season_begin_date int4 NULL,
	fiscal_year_quarter_prior int4 NULL,
	fiscal_season_in_year int4 NULL,
	fiscal_week_in_year int4 NULL,
	fiscal_month_in_year int4 NULL,
	fiscal_season_name_abb int4 NULL,
	fiscal_quarter_in_year int4 NULL,
	fiscal_year_season int4 NULL,
	fiscal_week int4 NULL,
	fiscal_year_season_prior int4 NULL,
	day_of_week int4 NULL,
	fiscal_season_end_date int4 NULL,
	fiscal_quarter_begin_date varchar(50) NULL,
	fiscal_year_begin_date varchar(50) NULL,
	fiscal_week_end_date varchar(50) NULL,
	fiscal_bi_week int4 NULL,
	weekday_indicator varchar(50) NULL,
	fiscal_month_name varchar(50) NULL,
	fiscal_month_name_abb varchar(50) NULL,
	fiscal_year_month int4 NULL,
	fiscal_year_period int4 NULL,
	fiscal_day_in_season int4 NULL,
	fiscal_day_in_quarter int4 NULL,
	fiscal_quarter_in_season int4 NULL,
	fiscal_year_month_prior int4 NULL,
	fiscal_season_name int4 NULL,
	fiscal_month_end_date varchar(50) NULL
);

--changeset hari.krishna@impactanalytics.co:calendar_date stripComments:false splitStatements:false context:Release_1_0 labels:alerts_initial_commit
--comment: initial changeset for calendar_date

ALTER TABLE "global".fiscal_mapping_table
ALTER COLUMN calendar_date TYPE VARCHAR(50),
ALTER COLUMN calendar_date SET NOT NULL;

--changeset hari.krishna@impactanalytics.co:fiscal_mapping_PK stripComments:false splitStatements:false context:Release_1_0 labels:alerts_initial_commit
--comment: initial changeset for fiscal_mapping_PK

ALTER TABLE "global".fiscal_mapping_table ADD CONSTRAINT fiscal_mapping_PK PRIMARY KEY (calendar_date);