--liquibase formatted sql
--changeset liquibase:oms_receipt_projection_v stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start_v
--comment: initial changeset for oms_receipt_projection_v

CREATE TABLE IF NOT EXISTS inventory_smart.oms_receipt_projection (
    article VARCHAR NULL,
    size_desc VARCHAR NULL,
    product_code VARCHAR NULL,
    vendor_name VARCHAR NULL,
    vendor_code VARCHAR NULL,
    loc_code VARCHAR NULL,
    channel VARCHAR NULL,
    fiscal_year_month INTEGER NULL,
    fiscal_month_name VARCHAR NULL,
    fiscal_year INTEGER NULL,
    receipt_quantity FLOAT NULL,
    receipt_quantity_cost FLOAT NULL,
    receipt_raw_roq FLOAT NULL,
    receipt_raw_roq_cost FLOAT NULL,
    receipt_roq_constrained INTEGER NULL,
    receipt_roq_constrained_cost FLOAT NULL,
    CONSTRAINT pk_oms_receipt_projection PRIMARY KEY (product_code,loc_code,channel,fiscal_year_month,fiscal_month_name)
);