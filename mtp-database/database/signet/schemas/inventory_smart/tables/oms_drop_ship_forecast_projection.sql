--liquibase formatted sql
--changeset liquibase:oms_drop_ship_forecast_projection stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for oms_drop_ship_forecast_projection

CREATE TABLE IF NOT EXISTS  inventory_smart.oms_drop_ship_forecast_projection (
	id serial4 NOT NULL,
	product_code varchar NOT NULL,
	loc_code varchar NOT NULL,
	vendor_code varchar NOT NULL,
	fiscal_year_month int4 NULL,
	fiscal_month_name varchar NOT NULL,
	predictions float4 NULL,
	total_cost float4 NULL,
	unit_cost float4 NULL,
	adjusted_predictions float4 NULL,
	adjusted_total_cost float4 NULL,
	created_by varchar NOT NULL DEFAULT '3'::character varying,
	created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_by varchar NULL,
	updated_at timestamptz NULL,
	is_reverted bool NOT NULL DEFAULT false,
	sku_vendor_id varchar NULL,
	modelled_flag varchar NULL,
	CONSTRAINT pk_oms_drop_ship_forecast_projection PRIMARY KEY (id),
	CONSTRAINT uk_oms_drop_ship_forecast_projection UNIQUE (product_code, loc_code, vendor_code, fiscal_year_month, fiscal_month_name)
);