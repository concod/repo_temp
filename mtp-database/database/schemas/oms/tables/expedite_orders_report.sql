--liquibase formatted sql
--changeset liquibase:expedite_orders_report stripComments:false splitStatements:false context:initial_release labels:liquibase_project_start
--comment: initial changeset for expedite_orders_report 

CREATE TABLE IF NOT EXISTS oms.expedite_orders_report (
	product_code varchar NOT NULL,
	loc_code varchar NOT NULL,
	channel varchar NOT NULL,
	po_id varchar NOT NULL,
	recom_receipt_date date NOT NULL,
	projected_delivery_date date NULL,
	po_receipts int4 NULL,
	vendor_name varchar NULL,
	vendor_code varchar NOT NULL,
	po_receipts_cost float8 NULL,
	dc_oh int4 NULL,
	total_store_inv int4 NULL,
	safety_stock_sto float8 NULL,
	CONSTRAINT pk_expedite_orders_report PRIMARY KEY (product_code, loc_code, vendor_code, channel, recom_receipt_date, po_id)
);

--changeset raja.duraisamy@impactanalytics.co:expedite_orders_report_performance_indexes_1 stripComments:false splitStatements:false context:performance_optimization labels:OMS_PERFORMANCE_INDEXES
--comment: Performance indexes for expedite_orders_report based on query analysis
CREATE INDEX IF NOT EXISTS idx_expedite_orders_report_product_loc ON oms.expedite_orders_report(product_code, loc_code);
CREATE INDEX IF NOT EXISTS idx_expedite_orders_report_product_loc_vendor_code ON oms.expedite_orders_report(product_code, loc_code, vendor_code);
CREATE INDEX IF NOT EXISTS idx_expedite_orders_report_po_id ON oms.expedite_orders_report(po_id);

--changeset raja.duraisamy@impactanalytics.co:index_expedite_orders_report_drop_indexes stripComments:false splitStatements:false context:generic_schema_update labels:GENERIC_SCHEMA_UPDATE
--comment: Index for expedite_orders_report
DROP INDEX IF EXISTS oms.idx_expedite_orders_report_product_loc;
