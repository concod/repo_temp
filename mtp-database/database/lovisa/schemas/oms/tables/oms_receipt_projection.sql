--liquibase formatted sql
--changeset liquibase:oms_receipt_projection1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for oms_receipt_projection1

CREATE TABLE IF NOT EXISTS inventory_smart.oms_receipt_projection (
	article varchar NULL,
	"size" varchar NULL,
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
	CONSTRAINT pk_oms_receipt_projection PRIMARY KEY (product_code, loc_code, channel, fiscal_year_month, fiscal_month_name)
);

--changeset liquibase:lovisa_oms_receipt_projection_new_columns stripComments:false splitStatements:false context:Release_1_0 labels:new_columns
--comment: new column additions to the receipt report

ALTER TABLE inventory_smart.oms_receipt_projection
ADD COLUMN approved_quantity float8 NULL,
ADD COLUMN approved_quantity_cost float8 NULL,
ADD COLUMN committed_quantity float8 NULL,
ADD COLUMN committed_quantity_cost float8 NULL;

--changeset raja.duraisamy:idx_orp_fiscal_aggregation runOnChange:false stripComments:false splitStatements:false context:PERFORMANCE_OPTIMIZATION labels:receipt_projection_performance_indexes
--comment: PERFORMANCE OPTIMIZATION - Create index on oms_receipt_projection for fiscal_year_month aggregation (similar to oms_vendor_projection)
CREATE INDEX IF NOT EXISTS idx_orp_fiscal_aggregation
ON inventory_smart.oms_receipt_projection (product_code, loc_code, size, fiscal_year_month)
INCLUDE (receipt_quantity, receipt_quantity_cost, approved_quantity, approved_quantity_cost, committed_quantity, committed_quantity_cost);