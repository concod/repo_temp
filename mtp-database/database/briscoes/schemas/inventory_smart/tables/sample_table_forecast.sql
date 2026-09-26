--liquibase formatted sql
--changeset navin.chandan@impactanalytics.co:sample_table_forecast stripComments:false splitStatements:false context:Release_1_0 labels:sample_table_forecast
--comment: initial changeset for sample_table_forecast

CREATE TABLE IF NOT EXISTS inventory_smart.sample_table_forecast (
	product_code text NULL,
	article text NULL,
	store_code text NULL,
	fiscal_year_week int4 NULL,
	final_forecast_qty int4 NULL
);
