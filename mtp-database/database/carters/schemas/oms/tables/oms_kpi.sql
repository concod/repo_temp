--liquibase formatted sql
--changeset liquibase:oms_kpi_update2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start_update2
--comment: initial changeset for oms_kpi_update2

CREATE TABLE IF NOT EXISTS inventory_smart.oms_kpi (
	product_code varchar NOT NULL,
	loc_code varchar NOT NULL,
	channel varchar NOT NULL,
	vendor_code varchar NOT NULL,
	vendor_name varchar NULL,
	store_inv int8 NULL,
	dc_inv int8 NULL,
	system_inv int8 NULL,
	mrpc float8 NULL,
	open_receipt_units int4 NULL,
	safety_stock int4 NULL,
	created_by int4 NOT NULL,
	created_at timestamptz NOT NULL,
	updated_by int4 NULL,
	updated_at timestamptz NULL,
	column_updated varchar NULL,
	effective_lead_time int4 NULL,
	adjusted_forecast_qty_4w float8 NULL,
	adjusted_forecast_qty_4w_lc float8 NULL,
	adjusted_forecast_qty_8w float8 NULL,
	adjusted_forecast_qty_8w_lc float8 NULL,
	adjusted_forecast_qty_12w float8 NULL,
	adjusted_forecast_qty_12w_lc float8 NULL,
	wos int4 NULL,
	target_service_level float8 NULL,
	ss_base float4 NULL,
	id serial4 NOT NULL,
	min_order_quantity_style int4 NULL,
	max_order_quantity_style int4 NULL,
	min_order_quantity_sku int4 NULL,
	max_order_quantity_sku int4 NULL,
	min_order_quantity_shipment int4 NULL,
	max_order_quantity_shipment int4 NULL,
	order_multiple int4 NULL,
	year_week int4 NULL,
	CONSTRAINT pk_oms_kpi PRIMARY KEY (product_code, loc_code, channel, vendor_code)
);
DROP INDEX IF EXISTS inventory_smart.idx_oms_kpi_product_code;
CREATE INDEX idx_oms_kpi_product_code ON inventory_smart.oms_kpi USING btree (product_code);