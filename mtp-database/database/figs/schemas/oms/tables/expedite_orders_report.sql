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


--changeset akshita.maheshwari@impactanalytics.co:new_store_mapping_0_0_2 stripComments:false splitStatements:false context:RELEASE_1_0_3 labels: po_receipts_cost
--comment Add COLUMN po_receipts_cost
ALTER TABLE inventory_smart.expedite_orders_report
    ADD COLUMN if not exists po_receipts_cost FLOAT NULL;

--changeset priyaranjan.pradhan@impactanalytics.co:new_store_mapping_0_0_2 stripComments:false splitStatements:false context:RELEASE_1_0_3 labels: expediate_order
--comment Add COLUMN expediate_order
ALTER TABLE inventory_smart.expedite_orders_report
    ADD COLUMN if not exists vendor_name VARCHAR NULL,
    ADD COLUMN if not exists vendor_code VARCHAR NULL;
