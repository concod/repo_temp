--liquibase formatted sql
--changeset rohan.santhosh@impactanalytics.co:dashboard_kpi_table stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for dashboard_kpi_table

CREATE TABLE inventory_smart.dashboard_kpi_table (
	country varchar NOT NULL,
	channel varchar NOT NULL,
	primary_style_id varchar NOT NULL,
	fiscal_year_week int4 NULL,
	l0_name varchar NULL,
	l1_name varchar NULL,
	l2_name varchar NULL,
	l3_name varchar NULL,
	l4_name varchar NULL,
	l5_name varchar NULL,
	s1_name varchar NULL,
	s2_name varchar NULL,
	s3_name varchar NULL,
	forecast_units_next_week float8 NULL,
	forecast_units_next_4_weeks float8 NULL,
	forecast_units_next_8_weeks float8 NULL,
	forecast_units_last_week float8 NULL,
	forecast_units_last_4_weeks float8 NULL,
	forecast_units_last_8_weeks float8 NULL,
	fs_forecast_wape_last_week float8 NULL,
	fs_forecast_wape_last_4_weeks float8 NULL,
	fs_forecast_wape_last_8_weeks float8 NULL
);

--changeset rohan.santhosh@impactanalytics.co:dashboard_kpi_table_1806 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start_1806
--comment: update for dashboard_kpi_table_1806

ALTER TABLE inventory_smart.dashboard_kpi_table ADD column if not exists l0_id varchar NULL;
ALTER TABLE inventory_smart.dashboard_kpi_table ADD column if not exists l1_id varchar NULL;
ALTER TABLE inventory_smart.dashboard_kpi_table ADD column if not exists l2_id varchar NULL;
ALTER TABLE inventory_smart.dashboard_kpi_table ADD column if not exists l3_id varchar NULL;
ALTER TABLE inventory_smart.dashboard_kpi_table ADD column if not exists l4_id varchar NULL;
ALTER TABLE inventory_smart.dashboard_kpi_table ADD column if not exists l5_id varchar NULL;

--changeset rohan.santhosh@impactanalytics.co:dashboard_kpi_table_2306 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start_2306
--comment: update for dashboard_kpi_table_2306

ALTER TABLE inventory_smart.dashboard_kpi_table ADD column if not exists actuals_last_week float8 NULL;
ALTER TABLE inventory_smart.dashboard_kpi_table ADD column if not exists actuals_last_4_weeks float8 NULL;
ALTER TABLE inventory_smart.dashboard_kpi_table ADD column if not exists actuals_last_8_weeks float8 NULL;

--changeset rohan.santhosh@impactanalytics.co:dashboard_kpi_table_3006 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start_3006
--comment: update for dashboard_kpi_table_3006

ALTER TABLE inventory_smart.dashboard_kpi_table DROP COLUMN IF EXISTS country;
ALTER TABLE inventory_smart.dashboard_kpi_table DROP COLUMN IF EXISTS channel;
ALTER TABLE inventory_smart.dashboard_kpi_table DROP COLUMN IF EXISTS s2_name;
ALTER TABLE inventory_smart.dashboard_kpi_table DROP COLUMN IF EXISTS s3_name;
ALTER TABLE inventory_smart.dashboard_kpi_table DROP COLUMN IF EXISTS forecast_units_next_8_weeks;
ALTER TABLE inventory_smart.dashboard_kpi_table DROP COLUMN IF EXISTS forecast_units_last_8_weeks;
ALTER TABLE inventory_smart.dashboard_kpi_table DROP COLUMN IF EXISTS actuals_last_8_weeks;
ALTER TABLE inventory_smart.dashboard_kpi_table DROP COLUMN IF EXISTS fs_forecast_wape_last_8_weeks;
ALTER TABLE inventory_smart.dashboard_kpi_table ADD column if not exists s0_name varchar NULL;
ALTER TABLE inventory_smart.dashboard_kpi_table ADD column if not exists forecast_units_next_12_weeks float8 NULL;
ALTER TABLE inventory_smart.dashboard_kpi_table ADD column if not exists forecast_units_last_12_weeks float8 NULL;
ALTER TABLE inventory_smart.dashboard_kpi_table ADD column if not exists actuals_last_12_weeks float8 NULL;
ALTER TABLE inventory_smart.dashboard_kpi_table ADD column if not exists fs_forecast_wape_last_12_weeks float8 NULL;