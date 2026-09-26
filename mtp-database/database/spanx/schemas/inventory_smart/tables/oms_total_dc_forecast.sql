--liquibase formatted sql
--changeset liquibase:oms_total_dc_forecast stripComments:false splitStatements:false context:initial_release labels:liquibase_project_start
--comment: initial changeset for oms_total_dc_forecast
CREATE TABLE inventory_smart.oms_total_dc_forecast (
	product_code varchar NOT NULL,
	loc_code varchar NOT NULL,
	channel varchar NOT NULL,
	fiscal_year_week int4 NOT NULL,
	dc_inv_bop_post_allocation float4 NULL,
	total_store_bop_inv float4 NULL,
	CONSTRAINT pk_oms_total_dc_forecast PRIMARY KEY (product_code, loc_code, channel, fiscal_year_week)
);