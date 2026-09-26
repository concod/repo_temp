--liquibase formatted sql
--changeset nischay.p@impactanalytics.co:article_inventory_dashboard stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts
--comment: initial changeset for article_inventory_dashboard


CREATE TABLE if not exists "global".fiscal_date_mapping (
	fiscal_day int2 NULL,
	fiscal_week_in_month int2 NULL,
	fiscal_week_in_quarter int2 NULL,
	fiscal_day_name varchar NULL,
	fiscal_week_begin_date date NULL,
	fiscal_week_end_date date NULL,
	fiscal_year_month int4 NULL,
	fiscal_day_name_abb varchar NULL,
	fiscal_month_in_quarter int2 NULL,
	fiscal_month_in_year int2 NULL,
	fiscal_month_begin_date date NULL,
	fiscal_week_in_season int2 NULL,
	fiscal_month_end_date date NULL,
	fiscal_quarter_in_year int2 NULL,
	fiscal_year_week_prior int4 NULL,
	fiscal_year_week_2wa int4 NULL,
	fiscal_quarter_begin_date date NULL,
	fiscal_quarter_end_date date NULL,
	fiscal_year_begin_date date NULL,
	fiscal_month_in_season int2 NULL,
	fiscal_year_end_date date NULL,
	fiscal_day_in_week int2 NULL,
	fiscal_prior_year_comp_week int4 NULL,
	fiscal_season_begin_date date NULL,
	fiscal_week int2 NULL,
	fiscal_quarter_name varchar NULL,
	fiscal_quarter_name_abb varchar NULL,
	fiscal_year_quarter_prior int4 NULL,
	fiscal_week_in_year int2 NULL,
	fiscal_season_in_year int2 NULL,
	fiscal_season_end_date date NULL,
	fiscal_year_season_prior int2 NULL,
	calendar_date date NULL,
	date_id int4 NULL,
	weekday_indicator varchar NULL,
	fiscal_quarter_in_season int2 NULL,
	fiscal_month_name varchar NULL,
	fiscal_month_name_abb varchar NULL,
	fiscal_year_month_prior int4 NULL,
	fiscal_year_period int4 NULL,
	fiscal_day_in_season int2 NULL,
	fiscal_day_in_quarter int2 NULL,
	fiscal_year_week int4 NULL,
	fiscal_bi_week int2 NULL,
	fiscal_day_in_year int2 NULL,
	day_of_week int2 NULL,
	"date" date NOT NULL,
	fiscal_day_in_month int2 NULL,
	fiscal_year_quarter int4 NULL,
	fiscal_season_name varchar NULL,
	fiscal_season_name_abb varchar NULL,
	fiscal_month int2 NULL,
	fiscal_quarter int2 NULL,
	fiscal_year int2 NULL,
	fiscal_year_week_3wa int4 NULL,
	fiscal_year_season int2 NULL,
	trend int4 NULL,
	holiday varchar NULL,
	cal_week_end_day date NULL,
	cal_week_start_day date NULL,
	CONSTRAINT date_un PRIMARY KEY (date)
);
CREATE INDEX if not exists fiscal_date_mapping_date_idx ON global.fiscal_date_mapping USING btree (date);
CREATE INDEX if not exists idx_calendar_date ON global.fiscal_date_mapping USING btree (calendar_date);
CREATE INDEX if not exists idx_fiscal_year_month ON global.fiscal_date_mapping USING btree (fiscal_year_month);


--changeset nischay.p@impactanalytics.co:fiscal_calendar_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts2
--comment: initial changeset for fiscal_calendar_1

ALTER TABLE "global".fiscal_date_mapping 
ADD COLUMN IF NOT EXISTS fiscal_day_name varchar NOT NULL,
ADD COLUMN IF NOT EXISTS fiscal_month_name varchar NOT NULL,
ADD COLUMN IF NOT EXISTS fiscal_week_in_month varchar NULL,
ADD COLUMN IF NOT EXISTS fiscal_week_begin_date varchar NULL,
ADD COLUMN IF NOT EXISTS fiscal_week_end_date varchar NULL;