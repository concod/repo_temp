--liquibase formatted sql
--changeset liquibase:oms_kpi stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for oms_kpi
CREATE TABLE inventory_smart.oms_kpi (
	product_code varchar NOT NULL,
	loc_code varchar NOT NULL,
	store_inv int8 NULL,
	dc_inv int8 NULL,
	system_inv int8 NULL,
	mrpc float8 NULL,
	open_receipt_units int4 NULL,
	safety_stock int4 NULL,
	created_by varchar NOT NULL,
	created_at timestamptz NOT NULL,
	updated_by varchar NULL,
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
	CONSTRAINT pk_oms_kpi PRIMARY KEY (product_code, loc_code)
);

--changeset sairaghunath.k:adding ss_base stripComments:false splitStatements:false context:Release_1_0 labels:MTP-23178
--comment:adding ss_base in oms_kpi
ALTER TABLE inventory_smart.oms_kpi ADD COLUMN IF NOT EXISTS ss_base float4 NULL;

--changeset aman.lakkoju:adding_dc_unavailable_column stripComments:false splitStatements:false context:Release_1_0 labels:MTP-23178
--comment:adding_dc_unavailable_column
ALTER TABLE inventory_smart.oms_kpi ADD COLUMN IF NOT EXISTS dc_unavailable int4 NULL;