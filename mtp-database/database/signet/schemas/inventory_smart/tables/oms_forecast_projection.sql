--liquibase formatted sql
--changeset aman.lakkoju:oms_forecast_projection stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for oms_forecast_projection


CREATE TABLE IF NOT EXISTS inventory_smart.oms_forecast_projection (
	id serial4 NOT NULL,
	product_code varchar NOT NULL,
	vendor_code varchar NOT NULL,
	loc_code varchar NOT NULL,
	fiscal_year_month int4 NULL,
	fiscal_month_name varchar NOT NULL,
	predictions float4 NULL,
	total_cost float4 NULL,
	CONSTRAINT pk_oms_forecast_projection PRIMARY KEY (id),
	CONSTRAINT uk_oms_forecast_projection UNIQUE (product_code, vendor_code, loc_code, fiscal_year_month, fiscal_month_name)
);
