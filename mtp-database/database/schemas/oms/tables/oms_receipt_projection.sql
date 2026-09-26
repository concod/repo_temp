--liquibase formatted sql
--changeset liquibase:oms_receipt_projection_update1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial  changeset for oms_receipt_projection

CREATE TABLE IF NOT EXISTS oms.oms_receipt_projection (
	article varchar NULL,
	size_desc varchar NULL,
	product_code varchar NOT NULL,
	vendor_name varchar NULL,
	vendor_code varchar NULL,
	loc_code varchar NOT NULL,
	channel varchar NOT NULL,
	fiscal_year_month int4 NOT NULL,
	fiscal_month_name varchar NOT NULL,
	fiscal_year int4 NULL,
	receipt_quantity float8 NULL,
	receipt_quantity_cost float8 NULL,
	receipt_raw_roq float8 NULL,
	receipt_raw_roq_cost float8 NULL,
	receipt_roq_constrained int4 NULL,
	receipt_roq_constrained_cost float8 NULL,
	"size" varchar NULL,
	approved_quantity float8 NULL,
	committed_quantity float8 NULL,
	approved_quantity_cost float8 NULL,
	committed_quantity_cost float8 NULL,
	CONSTRAINT pk_oms_receipt_projection PRIMARY KEY (product_code, loc_code, channel, fiscal_year_month, fiscal_month_name)
);

--changeset raja.duraisamy@impactanalytics.co:oms_receipt_projection_performance_indexes_1 stripComments:false splitStatements:false context:performance_optimization labels:OMS_PERFORMANCE_INDEXES
--comment: Performance indexes for oms_receipt_projection based on query analysis
CREATE INDEX IF NOT EXISTS idx_oms_receipt_projection_product_loc ON oms.oms_receipt_projection(product_code, loc_code);
CREATE INDEX IF NOT EXISTS idx_oms_receipt_projection_product_loc_fyw ON oms.oms_receipt_projection(product_code, loc_code, fiscal_year_month);
CREATE INDEX IF NOT EXISTS idx_oms_receipt_projection_product_loc_channel ON oms.oms_receipt_projection(product_code, loc_code, channel);

--changeset raja.duraisamy@impactanalytics.co:index_oms_receipt_projection_drop_indexes stripComments:false splitStatements:false context:generic_schema_update labels:GENERIC_SCHEMA_UPDATE
--comment: Index for oms_receipt_projection
DROP INDEX IF EXISTS oms.idx_oms_receipt_projection_product_loc;
DROP INDEX IF EXISTS oms.idx_oms_receipt_projection_product_loc_channel;
DROP INDEX IF EXISTS oms.idx_oms_receipt_projection_product_loc_fyw;