--liquibase formatted sql
--changeset sriraj.varanasi@impactanalytics.co:oms_kpi_master stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:briscoes_oms_kpi_master
--comment: initial changeset for oms_kpi_master

CREATE TABLE IF NOT EXISTS oms.oms_vendor_projection (
	article varchar NOT NULL,
	"size" varchar NULL,
	product_code varchar NOT NULL,
	vendor_name varchar NULL,
	vendor_code varchar NOT NULL,
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
	CONSTRAINT pk_oms_vendor_projection PRIMARY KEY (product_code, loc_code, vendor_code, channel, fiscal_year_month)
);

--changeset raja.duraisamy@impactanalytics.co:oms_vendor_projection_performance_indexes_1 stripComments:false splitStatements:false context:performance_optimization labels:OMS_PERFORMANCE_INDEXES
--comment: Performance indexes for oms_vendor_projection based on query analysis
CREATE INDEX IF NOT EXISTS idx_oms_vendor_projection_product_loc ON oms.oms_vendor_projection(product_code, loc_code);
CREATE INDEX IF NOT EXISTS idx_oms_vendor_projection_product_loc_fyw ON oms.oms_vendor_projection(product_code, loc_code, fiscal_year_month);
CREATE INDEX IF NOT EXISTS idx_oms_vendor_projection_product_loc_channel ON oms.oms_vendor_projection(product_code, loc_code, channel);

--changeset raja.duraisamy@impactanalytics.co:oms_vendor_projection_add_missing_columns stripComments:false splitStatements:false context:generic_schema_update labels:GENERIC_SCHEMA_UPDATE
--comment: Add missing generic schema columns to oms_vendor_projection
ALTER TABLE oms.oms_vendor_projection ADD COLUMN IF NOT EXISTS size_desc varchar(256) NULL;

--changeset raja.duraisamy@impactanalytics.co:index_oms_vendor_projection_drop_indexes stripComments:false splitStatements:false context:generic_schema_update labels:GENERIC_SCHEMA_UPDATE
--comment: Index for oms_vendor_projection
DROP INDEX IF EXISTS oms.idx_oms_vendor_projection_product_loc;
DROP INDEX IF EXISTS oms.idx_oms_vendor_projection_product_loc_fyw;
DROP INDEX IF EXISTS oms.idx_oms_vendor_projection_product_loc_channel;