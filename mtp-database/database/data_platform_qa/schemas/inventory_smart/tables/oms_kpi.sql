--liquibase formatted sql
--changeset liquibase:oms_kpi stripComments:false splitStatements:false context:Release_1 labels:VS-353
--comment: initial changeset for oms_kpi
CREATE TABLE IF NOT EXISTS inventory_smart.oms_kpi (
	year_week int4 NULL,
	product_code varchar NULL,
	loc_code varchar NULL,
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
	CONSTRAINT oms_kpi_pkey PRIMARY KEY (product_code)
);