--liquibase formatted sql
--changeset kanishka.parashar@impactanalytics.co:oms_vendor_projection_store stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:oms_vendor_projection_store
--comment: initial changeset for oms_vendor_projection_store

CREATE TABLE inventory_smart.oms_vendor_projection_store (
	article text NULL,
	"size" text NULL,
	product_code text NOT NULL,
	vendor_name text NULL,
	vendor_code text NULL,
	store_code text NOT NULL,
	channel text NULL,
	fiscal_year_month int8 NOT NULL,
	fiscal_month_name text NULL,
	fiscal_year int8 NULL,
	store_forecast_pred_constrained float8 NULL,
	store_forecast_pred_constrained_cost float8 NULL,
	store_forecast_pred_unconstrained float8 NULL,
	store_forecast_pred_unconstrained_cost float8 NULL,
	order_quantity int8 NULL,
	order_quantity_cost float8 NULL,
	raw_roq int8 NULL,
	raw_roq_cost float8 NULL,
	roq_constrained int8 NULL,
	roq_constrained_cost float8 NULL,
	CONSTRAINT pk_oms_vendor_projection_store PRIMARY KEY (product_code, store_code, fiscal_year_month)
);

--changeset kanishka.parashar@impactanalytics.co:adding_columns stripComments:false splitStatements:false context:Release_1_0 labels:drop_not_null_constraint
--comment: adding_missing_columns
ALTER TABLE inventory_smart.oms_vendor_projection_store add COLUMN store_forecast_pred float8 NULL;
ALTER TABLE inventory_smart.oms_vendor_projection_store add COLUMN store_forecast_pred_cost float8 NULL;