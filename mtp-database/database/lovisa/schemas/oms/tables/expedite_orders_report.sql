--liquibase formatted sql
--changeset liquibase:expedite_orders_report-MTP-101297 stripComments:false splitStatements:false context:initial_release labels:liquibase_project_start
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

--changeset liquibase:add_vendor_columns_dc_name_to_expedite_orders_report_MTP-101297 stripComments:false splitStatements:false context:MTP-101297 labels:MTP-101297_1
--comment: add vendor_name, vendor_code and dc_name columns to expedite_orders_report

ALTER TABLE inventory_smart.expedite_orders_report ADD COLUMN IF NOT EXISTS vendor_name VARCHAR NULL;
ALTER TABLE inventory_smart.expedite_orders_report ADD COLUMN IF NOT EXISTS vendor_code VARCHAR NOT NULL DEFAULT '';
ALTER TABLE inventory_smart.expedite_orders_report ADD COLUMN IF NOT EXISTS dc_name VARCHAR NULL;
ALTER TABLE inventory_smart.expedite_orders_report ADD COLUMN IF NOT EXISTS po_receipts_cost VARCHAR NULL;