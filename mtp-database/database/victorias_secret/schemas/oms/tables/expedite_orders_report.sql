--liquibase formatted sql
--changeset liquibase:expedite_orders_report stripComments:false splitStatements:false context:initial_release labels:liquibase_project_start
--comment: initial changeset for expedite_orders_report 

CREATE TABLE IF NOT EXISTS inventory_smart.expedite_orders_report (
    product_code VARCHAR NULL,
    loc_code VARCHAR NULL,
    channel VARCHAR NULL,
    po_id VARCHAR NULL,
    recom_receipt_date DATE NULL,
    projected_delivery_date DATE NULL,
    po_receipts INTEGER NULL,
    dc_oh INTEGER NULL,
    total_store_inv INTEGER NULL,
    safety_stock_sto FLOAT NULL,
    CONSTRAINT pk_expedite_orders_report PRIMARY KEY (product_code,loc_code,recom_receipt_date,po_id)
);