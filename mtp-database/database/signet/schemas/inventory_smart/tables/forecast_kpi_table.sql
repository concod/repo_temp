--liquibase formatted sql
--changeset liquibase:forecast_kpi_table stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for forecast_kpi_table
CREATE TABLE inventory_smart.forecast_kpi_table (
	product_code varchar NOT NULL,
	store_code varchar NOT NULL,
	store_code_name varchar NOT NULL,
	store_channel_description varchar NOT NULL,
	adjusted_forecast_qty_lw float4 NULL,
	predicted_qty_lw float4 NULL,
	qty_lw int4 NULL,
	adjusted_forecast_qty_l4w float4 NULL,
	predicted_qty_l4w float4 NULL,
	qty_l4w int4 NULL,
	adjusted_forecast_qty_l8w float4 NULL,
	predicted_qty_l8w float4 NULL,
	qty_l8w int4 NULL,
	product_channel_name varchar NULL,
	l0_name varchar NOT NULL,
	l1_name varchar NULL,
	l2_name varchar NULL,
	merchandise_category varchar NULL,
	planning_ownership varchar NULL,
	channel varchar NULL,
	state varchar NULL,
	district varchar NULL,
	city varchar NULL,
	store_description text NULL,
	CONSTRAINT forecast_kpi_table_un UNIQUE (product_code, store_code)
);

ALTER TABLE inventory_smart.forecast_kpi_table ADD CONSTRAINT forecast_kpi_table_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE;
ALTER TABLE inventory_smart.forecast_kpi_table ADD CONSTRAINT forecast_kpi_table_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE;