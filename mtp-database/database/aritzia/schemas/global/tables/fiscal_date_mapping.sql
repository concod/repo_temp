--liquibase formatted sql
--changeset rohan.santhosh@impactanalytics.co:fiscal_date_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for fiscal_date_mapping

CREATE TABLE "global".fiscal_date_mapping (
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
	holiday varchar(1) NULL,
	fiscal_half_year int4 NULL,
	half_year_name varchar NULL,
	CONSTRAINT date_un PRIMARY KEY (date)
);
CREATE INDEX fiscal_date_mapping_date_idx ON global.fiscal_date_mapping USING btree (date);
CREATE INDEX idx_calendar_date ON global.fiscal_date_mapping USING btree (calendar_date);
CREATE INDEX idx_fiscal_year_month ON global.fiscal_date_mapping USING btree (fiscal_year_month);

--changeset rohan.santhosh@impactanalytics.co:fiscal_date_mapping_product_columns stripComments:false splitStatements:false context:Inventory_Smart labels:SAP-16
--comment: Adding product_calendar columns 
ALTER TABLE "global".fiscal_date_mapping ADD column if not exists fiscal_year_name varchar NULL;
ALTER TABLE "global".fiscal_date_mapping ADD column if not exists fiscal_week_name varchar NULL;
ALTER TABLE "global".fiscal_date_mapping ADD column if not exists fiscal_half_year_begin_date date NULL;
ALTER TABLE "global".fiscal_date_mapping ADD column if not exists fiscal_half_year_end_date date NULL;
ALTER TABLE "global".fiscal_date_mapping ADD column if not exists fiscal_period int4 NULL;
ALTER TABLE "global".fiscal_date_mapping ADD column if not exists fiscal_period_name varchar NULL;
ALTER TABLE "global".fiscal_date_mapping ADD column if not exists fiscal_period_week int4 NULL;
ALTER TABLE "global".fiscal_date_mapping ADD column if not exists fiscal_period_begin_date date NULL;
ALTER TABLE "global".fiscal_date_mapping ADD column if not exists fiscal_period_end_date date NULL;
ALTER TABLE "global".fiscal_date_mapping ADD column if not exists fiscal_year_period_name varchar NULL;
ALTER TABLE "global".fiscal_date_mapping ADD column if not exists standard_month int4 NULL;
ALTER TABLE "global".fiscal_date_mapping ADD column if not exists standard_weekday int4 NULL;
ALTER TABLE "global".fiscal_date_mapping ADD column if not exists standard_day int4 NULL;
ALTER TABLE "global".fiscal_date_mapping ADD column if not exists product_year int4 NULL;
ALTER TABLE "global".fiscal_date_mapping ADD column if not exists product_season varchar NULL;
ALTER TABLE "global".fiscal_date_mapping ADD column if not exists product_season_name varchar NULL;
ALTER TABLE "global".fiscal_date_mapping ADD column if not exists product_sub_season varchar NULL;
ALTER TABLE "global".fiscal_date_mapping ADD column if not exists product_sub_season_name varchar NULL;
ALTER TABLE "global".fiscal_date_mapping ADD column if not exists product_sub_season_week varchar NULL;
ALTER TABLE "global".fiscal_date_mapping ADD column if not exists product_season_week varchar NULL;
ALTER TABLE "global".fiscal_date_mapping ADD column if not exists product_week int4 NULL;
ALTER TABLE "global".fiscal_date_mapping ADD column if not exists product_season_begin_date date NULL;
ALTER TABLE "global".fiscal_date_mapping ADD column if not exists product_season_end_date date NULL;
ALTER TABLE "global".fiscal_date_mapping ADD column if not exists product_sub_season_begin_date date NULL;
ALTER TABLE "global".fiscal_date_mapping ADD column if not exists product_sub_season_end_date date NULL;
ALTER TABLE "global".fiscal_date_mapping ADD column if not exists product_year_begin_date date NULL;
ALTER TABLE "global".fiscal_date_mapping ADD column if not exists product_year_end_date date NULL;
ALTER TABLE "global".fiscal_date_mapping ADD column if not exists product_year_season_name varchar NULL;
ALTER TABLE "global".fiscal_date_mapping ADD column if not exists product_year_week_number int4 NULL;
ALTER TABLE "global".fiscal_date_mapping ADD column if not exists product_season_week_number int4 NULL;
ALTER TABLE "global".fiscal_date_mapping ADD column if not exists product_season_week_group_number varchar NULL;
ALTER TABLE "global".fiscal_date_mapping ADD column if not exists product_season_week_group varchar NULL;
ALTER TABLE "global".fiscal_date_mapping ADD column if not exists product_season_week_name varchar NULL;

--changeset rohan.santhosh@impactanalytics.co:fiscal_date_mapping_product_columns_3004 stripComments:false splitStatements:false context:Inventory_Smart labels:SAP-16
--comment: Adding fiscal_sub_season column 
ALTER TABLE "global".fiscal_date_mapping ADD column if not exists fiscal_sub_season varchar NULL;

--changeset rohan.santhosh@impactanalytics.co:fiscal_date_mapping_product_columns_0306 stripComments:false splitStatements:false context:Inventory_Smart_v3 labels:SAP-16_v3
--comment: Adding fiscal_season column 
ALTER TABLE "global".fiscal_date_mapping ADD column if not exists fiscal_season varchar NULL;

--changeset rohan.santhosh@impactanalytics.co:fiscal_date_mapping_product_columns_2306 stripComments:false splitStatements:false context:Inventory_Smart_v4 labels:SAP-16_v4
--comment: Adding fiscal columns 2306
ALTER TABLE "global".fiscal_date_mapping ADD column if not exists fiscal_season_week_group varchar NULL;
ALTER TABLE "global".fiscal_date_mapping ADD column if not exists fiscal_sub_season_week_number int4 NULL;
ALTER TABLE "global".fiscal_date_mapping ADD column if not exists fiscal_week int4 NULL;