--liquibase formatted sql
--changeset liquibase:granular_forecast_table stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for granular_forecast_table
CREATE TABLE source_smart.granular_forecast_table (
	forecast_id varchar(255) NOT NULL,
	season_id varchar(255) NULL,
	style_color_id varchar(255) NULL,
	dc_code varchar(255) NULL,
	forecast_quantity int4 NULL,
	last_updated date NULL,
	CONSTRAINT granular_forecast_table_pk PRIMARY KEY (forecast_id),
	CONSTRAINT fk_style_color FOREIGN KEY (style_color_id) REFERENCES source_smart.product_master(style_color_id) ON DELETE CASCADE,
	CONSTRAINT granular_forecast_table_season_master_fk FOREIGN KEY (season_id) REFERENCES source_smart.season_master(season_id) ON DELETE CASCADE,
	CONSTRAINT granular_forecast_table_store_master_fk FOREIGN KEY (dc_code) REFERENCES source_smart.store_master(store_code) ON DELETE CASCADE
);