--liquibase formatted sql
--changeset liquibase:oms_receipt_projection stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for oms_receipt_projection

CREATE TABLE IF NOT EXISTS inventory_smart.oms_receipt_projection (
	article varchar NULL,
	size_desc varchar NULL,
	product_code varchar NULL,
	vendor_name varchar NULL,
	vendor_code varchar NULL,
	loc_code varchar NULL,
	channel varchar NULL,
	fiscal_year_month int4 NULL,
	fiscal_month_name varchar NULL,
	fiscal_year int4 NULL,
	receipt_quantity float8 NULL,
	receipt_quantity_cost float8 NULL,
	receipt_raw_roq float8 NULL,
	receipt_raw_roq_cost float8 NULL,
	receipt_roq_constrained int4 NULL,
	receipt_roq_constrained_cost float8 NULL
);

--changeset liquibase:oms_receipt_projection_new_columns stripComments:false splitStatements:false context:Release_1_0 labels:new_columns
--comment: new column additions to the receipt report

ALTER TABLE inventory_smart.oms_receipt_projection
ADD COLUMN IF NOT EXISTS approved_quantity float8 NULL,
ADD COLUMN IF NOT EXISTS approved_quantity_cost float8 NULL,
ADD COLUMN IF NOT EXISTS committed_quantity float8 NULL,
ADD COLUMN IF NOT EXISTS committed_quantity_cost float8 NULL;