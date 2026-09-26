--liquibase formatted sql
--changeset liquibase:expedite_orders_report if exist stripComments:false splitStatements:false context:initial_release labels:liquibase_project_start if exist
--comment: initial changeset for expedite_orders_report if exis

CREATE TABLE IF NOT EXISTS inventory_smart.expedite_orders_report (
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