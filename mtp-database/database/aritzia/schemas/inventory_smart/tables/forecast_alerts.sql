--liquibase formatted sql
--changeset rohan.santhosh@impactanalytics.co:forecast_alerts stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for forecast_alerts

CREATE TABLE inventory_smart.forecast_alerts (
	s0_name varchar NOT NULL,
	s1_name varchar NOT NULL,
	l0_name varchar NOT NULL,
	l1_name varchar NOT NULL,
	l2_name varchar NOT NULL,
	l3_name varchar NOT NULL,
	l4_name varchar NOT NULL,
	l5_name varchar NOT NULL,
	alert_name varchar NULL,
	past_1_week_actual_sales float8 NULL,
	past_1_week_wape float8 NULL,
	past_season_actual_sales float8 NULL,
	this_season_actual_sales float8 NULL,
	last_season_wape float8 NULL,
	this_season_wape float8 NULL,
	next_1_week_agg_forecast float8 NULL,
	next_4_week_agg_forecast float8 NULL,
	next_12_week_agg_forecast float8 NULL,
	next_season_agg_forecast float8 NULL
);

--changeset rohan.santhosh@impactanalytics.co:forecast_alerts_V2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start_V2
--comment: added alerts
ALTER TABLE inventory_smart.forecast_alerts DROP COLUMN IF EXISTS alert_name;
ALTER TABLE inventory_smart.forecast_alerts ADD COLUMN IF NOT EXISTS fiscal_year_week int4 NULL;
ALTER TABLE inventory_smart.forecast_alerts ADD COLUMN IF NOT EXISTS country_channel_accuracy_past_4_week int4 NULL;
ALTER TABLE inventory_smart.forecast_alerts ADD COLUMN IF NOT EXISTS country_channel_accuracy_past_8_week int4 NULL;
ALTER TABLE inventory_smart.forecast_alerts ADD COLUMN IF NOT EXISTS country_channel_accuracy_past_12_week int4 NULL;
ALTER TABLE inventory_smart.forecast_alerts ADD COLUMN IF NOT EXISTS Zero_Forecast_Flag int4 NULL;
ALTER TABLE inventory_smart.forecast_alerts ADD COLUMN IF NOT EXISTS Under_Forecast_Trend int4 NULL;
ALTER TABLE inventory_smart.forecast_alerts ADD COLUMN IF NOT EXISTS Over_Forecast_Trend int4 NULL;
ALTER TABLE inventory_smart.forecast_alerts ADD COLUMN IF NOT EXISTS Override_accuracy_Gap_Last_4_Weeks int4 NULL;
ALTER TABLE inventory_smart.forecast_alerts ADD COLUMN IF NOT EXISTS Override_accuracy_Gap_Last_8_Weeks int4 NULL;
ALTER TABLE inventory_smart.forecast_alerts ADD COLUMN IF NOT EXISTS Override_accuracy_Gap_Last_12_Weeks int4 NULL;
ALTER TABLE inventory_smart.forecast_alerts ADD COLUMN IF NOT EXISTS Model_Drift int4 NULL;

--changeset rohan.santhosh@impactanalytics.co:forecast_alerts_V3 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start_V3
--comment: changeed to small letters
ALTER TABLE inventory_smart.forecast_alerts DROP COLUMN IF EXISTS Zero_Forecast_Flag;
ALTER TABLE inventory_smart.forecast_alerts DROP COLUMN IF EXISTS Under_Forecast_Trend;
ALTER TABLE inventory_smart.forecast_alerts DROP COLUMN IF EXISTS Over_Forecast_Trend;
ALTER TABLE inventory_smart.forecast_alerts DROP COLUMN IF EXISTS Override_accuracy_Gap_Last_4_Weeks;
ALTER TABLE inventory_smart.forecast_alerts DROP COLUMN IF EXISTS Override_accuracy_Gap_Last_8_Weeks;
ALTER TABLE inventory_smart.forecast_alerts DROP COLUMN IF EXISTS Override_accuracy_Gap_Last_12_Weeks;
ALTER TABLE inventory_smart.forecast_alerts DROP COLUMN IF EXISTS Model_Drift;
ALTER TABLE inventory_smart.forecast_alerts ADD COLUMN IF NOT EXISTS zero_forecast_flag int4 NULL;
ALTER TABLE inventory_smart.forecast_alerts ADD COLUMN IF NOT EXISTS under_forecast_trend int4 NULL;
ALTER TABLE inventory_smart.forecast_alerts ADD COLUMN IF NOT EXISTS over_forecast_trend int4 NULL;
ALTER TABLE inventory_smart.forecast_alerts ADD COLUMN IF NOT EXISTS override_accuracy_gap_last_4_weeks int4 NULL;
ALTER TABLE inventory_smart.forecast_alerts ADD COLUMN IF NOT EXISTS override_accuracy_gap_wast_8_weeks int4 NULL;
ALTER TABLE inventory_smart.forecast_alerts ADD COLUMN IF NOT EXISTS override_accuracy_gap_wast_12_weeks int4 NULL;
ALTER TABLE inventory_smart.forecast_alerts ADD COLUMN IF NOT EXISTS model_drift int4 NULL;

--changeset rohan.santhosh@impactanalytics.co:forecast_alerts_V4 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start_V4
--comment: typo fix
ALTER TABLE inventory_smart.forecast_alerts DROP COLUMN IF EXISTS override_accuracy_gap_wast_8_weeks;
ALTER TABLE inventory_smart.forecast_alerts DROP COLUMN IF EXISTS override_accuracy_gap_wast_12_weeks;
ALTER TABLE inventory_smart.forecast_alerts ADD COLUMN IF NOT EXISTS override_accuracy_gap_last_8_weeks int4 NULL;
ALTER TABLE inventory_smart.forecast_alerts ADD COLUMN IF NOT EXISTS override_accuracy_gap_last_12_weeks int4 NULL;