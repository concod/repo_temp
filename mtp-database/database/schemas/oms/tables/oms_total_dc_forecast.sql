--liquibase formatted sql
--changeset samarjit.mazumder@impactanalytics.co:oms_total_dc_forecast stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:briscoes_oms_total_dc_forecast
--comment: initial changeset for oms_total_dc_forecast

CREATE TABLE IF NOT EXISTS oms.oms_total_dc_forecast (
	product_code varchar NOT NULL,
	loc_code varchar NOT NULL,
	channel varchar NOT NULL,
	fiscal_year_week int4 NOT NULL,
	dc_inv_bop_post_allocation float4 NULL,
	total_store_bop_inv float4 NULL,
	CONSTRAINT pk_oms_total_dc_forecast PRIMARY KEY (product_code, loc_code, channel, fiscal_year_week)
);

--changeset raja.duraisamy@impactanalytics.co:oms_total_dc_forecast_performance_indexes_1 stripComments:false splitStatements:false context:performance_optimization labels:OMS_PERFORMANCE_INDEXES
--comment: Performance indexes for oms_total_dc_forecast based on query analysis
CREATE INDEX IF NOT EXISTS idx_oms_total_dc_forecast_product_loc ON oms.oms_total_dc_forecast(product_code, loc_code);
CREATE INDEX IF NOT EXISTS idx_oms_total_dc_forecast_product_loc_fyw ON oms.oms_total_dc_forecast(product_code, loc_code, fiscal_year_week);
CREATE INDEX IF NOT EXISTS idx_oms_total_dc_forecast_product_loc_channel ON oms.oms_total_dc_forecast(product_code, loc_code, channel);

--changeset raja.duraisamy@impactanalytics.co:index_oms_total_dc_forecast_drop_indexes stripComments:false splitStatements:false context:generic_schema_update labels:GENERIC_SCHEMA_UPDATE
--comment: Index for oms_total_dc_forecast
DROP INDEX IF EXISTS oms.idx_oms_total_dc_forecast_product_loc;
DROP INDEX IF EXISTS oms.idx_oms_total_dc_forecast_product_loc_fyw;
DROP INDEX IF EXISTS oms.idx_oms_total_dc_forecast_product_loc_channel;