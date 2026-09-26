--liquibase formatted sql
--changeset liquibase:expedite_orders_report_cb_not_exists_added stripComments:false splitStatements:false context:initial_release labels:liquibase_project_start_not_exists_added
--comment: initial changeset for expedite_orders_report cb_not_exists_added

CREATE TABLE IF NOT EXISTS inventory_smart.expedite_orders_report (
    product_code VARCHAR NULL,
    loc_code VARCHAR NULL,
    channel VARCHAR NULL,
    po_id VARCHAR NULL,
    recom_receipt_date DATE NULL,
    projected_delivery_date DATE NULL,
    po_receipts INTEGER NULL,
    vendor_name VARCHAR NULL,
    vendor_code VARCHAR NULL,
    po_receipts_cost FLOAT NULL,
    dc_oh INTEGER NULL,
    total_store_inv INTEGER NULL,
    safety_stock_sto FLOAT NULL,
    CONSTRAINT pk_expedite_orders_report PRIMARY KEY (product_code,loc_code,vendor_code,channel,recom_receipt_date,po_id)
);