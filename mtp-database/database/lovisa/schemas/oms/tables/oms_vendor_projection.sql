--liquibase formatted sql
--changeset liquibase:oms_vendor_projection stripComments:false splitStatements:false context:Release_1_0 labels:oms_report1
--comment: oms_vendor_projection_report

CREATE TABLE IF NOT EXISTS inventory_smart.oms_vendor_projection (
	article varchar NOT NULL,
	size varchar NULL,
	product_code varchar NOT NULL,
	vendor_name varchar NULL,
	vendor_code varchar NULL,
	loc_code varchar NOT NULL,
	channel varchar NOT NULL,
	fiscal_year_month int4 NOT NULL,
	fiscal_month_name varchar NULL,
	fiscal_year int4 NULL,
	store_forecast_pred float8 NULL,
	store_forecast_pred_cost float8 NULL,
	dc_forecast_pred_constrained float8 NULL,
	dc_forecast_pred_constrained_cost float8 NULL,
	dc_forecast_pred_unconstrained float8 NULL,
	dc_forecast_pred_unconstrained_cost float8 NULL,
	order_quantity float8 NULL,
	order_quantity_cost float8 NULL,
	raw_roq float8 NULL,
	raw_roq_cost float8 NULL,
	roq_constrained int4 NULL,
	roq_constrained_cost float8 NULL,
	CONSTRAINT pk_oms_vendor_projection PRIMARY KEY (product_code, loc_code, fiscal_year_month)
);

--changeset raja.duraisamy:idx_ovp_fiscal_aggregation runOnChange:false stripComments:false splitStatements:false context:PERFORMANCE_OPTIMIZATION labels:vendor_projection_performance_indexes
--comment: PERFORMANCE OPTIMIZATION - Create index on oms_vendor_projection for fiscal_year_month aggregation
CREATE INDEX IF NOT EXISTS idx_ovp_fiscal_aggregation
ON inventory_smart.oms_vendor_projection (product_code, loc_code, size, fiscal_year_month)
INCLUDE (order_quantity, order_quantity_cost);