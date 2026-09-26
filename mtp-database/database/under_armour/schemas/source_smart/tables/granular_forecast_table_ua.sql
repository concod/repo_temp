--liquibase formatted sql
--changeset liquibase:granular_forecast_table_ua stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for granular_forecast_table_ua
CREATE TABLE source_smart.granular_forecast_table_ua (
	forecast_id varchar(255) NOT NULL,
	season_id varchar(255) NULL,
	style_color_id varchar(255) NULL,
	dc_code varchar(255) NULL,
	forecast_version varchar(50) NULL,
	forecast_quantity int4 NULL,
	last_updated date NULL,
	product_code varchar(255) NULL
);

--changeset mayank.mukundam@impactanalytics.co:granular_forecast_table_ua_add_columns stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: add columns to granular_forecast_table_ua
ALTER TABLE source_smart.granular_forecast_table_ua ADD COLUMN is_updated bool;
ALTER TABLE source_smart.granular_forecast_table_ua ADD COLUMN is_active bool;
ALTER TABLE source_smart.granular_forecast_table_ua ADD COLUMN created_at timestamptz;
ALTER TABLE source_smart.granular_forecast_table_ua ADD COLUMN updated_at timestamptz;

CREATE INDEX idx_granular_forecast_table_ua_prod_dc_fv_season ON source_smart.granular_forecast_table_ua USING btree (product_code, dc_code, forecast_version, season_id);