--liquibase formatted sql
--changeset kanishka.parashar@impactanalytics.co:oms_total_dc_forecast stripComments:false splitStatements:false context:VS_inv_smart labels:oms_total_dc_forecast_v1
--comment: initial changeset for oms_total_dc_forecast intl 
CREATE TABLE IF NOT EXISTS inventory_smart.oms_total_dc_forecast (
	product_code varchar NOT NULL,
	loc_code varchar NOT NULL,
	channel varchar NULL,
	fiscal_year_week int4 NOT NULL,
	dc_inv_bop_post_allocation float4 NULL,
	total_store_bop_inv float4 NULL,
	CONSTRAINT pk_oms_total_dc_forecast PRIMARY KEY (product_code, loc_code, channel, fiscal_year_week)
);