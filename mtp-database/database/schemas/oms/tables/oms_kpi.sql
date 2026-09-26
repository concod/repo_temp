--liquibase formatted sql
--changeset liquibase:oms_kpi_cb_test_new_change_pack_added stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start_update2
--comment: initial changeset for oms_kpi_cb_test

CREATE TABLE IF NOT EXISTS oms.oms_kpi (
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
	pack_id varchar NOT NULL,
	"size" varchar NOT NULL,
	"cost" float8 NULL,
	CONSTRAINT pk_oms_kpi PRIMARY KEY (product_code, pack_id, loc_code, channel, vendor_code)
);

--changeset raja.duraisamy@impactanalytics.co:oms_kpi_performance_indexes_1 stripComments:false splitStatements:false context:performance_optimization labels:OMS_PERFORMANCE_INDEXES
--comment: Performance indexes for oms_kpi based on query analysis
CREATE INDEX IF NOT EXISTS idx_oms_kpi_product_code ON oms.oms_kpi USING btree (product_code);
CREATE INDEX IF NOT EXISTS idx_oms_kpi_product_loc ON oms.oms_kpi(product_code, loc_code);
CREATE INDEX IF NOT EXISTS idx_oms_kpi_product_loc_vendor_code ON oms.oms_kpi(product_code, loc_code, vendor_code);



--changeset raja.duraisamy@impactanalytics.co:oms_kpi_add_missing_columns stripComments:false splitStatements:false context:generic_schema_update labels:GENERIC_SCHEMA_UPDATE
--comment: Add missing generic schema columns to oms_kpi
ALTER TABLE oms.oms_kpi ADD COLUMN IF NOT EXISTS safety_stock_sl float8 NULL;

--changeset raja.duraisamy@impactanalytics.co:index_oms_kpi_drop_indexes stripComments:false splitStatements:false context:generic_schema_update labels:GENERIC_SCHEMA_UPDATE
--comment: Index for oms_kpi
DROP INDEX IF EXISTS oms.idx_oms_kpi_product_code;
DROP INDEX IF EXISTS oms.idx_oms_kpi_product_loc;