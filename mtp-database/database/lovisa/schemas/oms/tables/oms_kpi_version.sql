--liquibase formatted sql
--changeset swapnil.bhange:oms_kpi_versionV1 stripComments:false splitStatements:false context:Release_1_0 labels:oms_kpi_version
--comment: initial changeset for oms_kpi_version v1

CREATE TABLE IF NOT EXISTS inventory_smart.oms_kpi_version (
	version_code int4 NOT NULL,
	product_code varchar NOT NULL,
	loc_code varchar NOT NULL,
	dc_inv int4 NULL,
	safety_stock int4 NULL,
	created_by int4 NULL,
	created_at timestamptz NULL,
	updated_by int4 NULL,
	updated_at timestamptz NULL,
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
	system_inv int4 NULL,
	store_inv int4 NULL,
	open_receipt_units int4 NULL,
	mrpc float8 NULL,
	channel varchar NOT NULL,
	min_order_quantity_sku int4 NULL,
	order_multiple int4 NULL,
	CONSTRAINT pk_oms_kpi PRIMARY KEY (version_code, product_code, loc_code, channel)
) PARTITION BY LIST (version_code);

--changeset swapnil.b-5:oms_kpi_version_v2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding columns in oms_kpi_version_v2
ALTER TABLE inventory_smart.oms_kpi_version ADD COLUMN IF NOT EXISTS column_updated varchar NULL;
ALTER TABLE inventory_smart.oms_kpi_version ADD COLUMN IF NOT EXISTS id serial4 NOT NULL;
ALTER TABLE inventory_smart.oms_kpi_version ADD COLUMN IF NOT EXISTS max_order_quantity_shipment int4 NULL;
ALTER TABLE inventory_smart.oms_kpi_version ADD COLUMN IF NOT EXISTS max_order_quantity_sku int4 NULL;
ALTER TABLE inventory_smart.oms_kpi_version ADD COLUMN IF NOT EXISTS max_order_quantity_style int4 NULL;
ALTER TABLE inventory_smart.oms_kpi_version ADD COLUMN IF NOT EXISTS min_order_quantity_shipment int4 NULL;
ALTER TABLE inventory_smart.oms_kpi_version ADD COLUMN IF NOT EXISTS min_order_quantity_style int4 NULL;
ALTER TABLE inventory_smart.oms_kpi_version ADD COLUMN IF NOT EXISTS vendor_code varchar NOT NULL;
ALTER TABLE inventory_smart.oms_kpi_version ADD COLUMN IF NOT EXISTS vendor_name varchar NULL;
ALTER TABLE inventory_smart.oms_kpi_version ADD COLUMN IF NOT EXISTS year_week int4 NULL;
