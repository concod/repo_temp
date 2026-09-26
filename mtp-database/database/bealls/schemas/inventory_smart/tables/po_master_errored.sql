--liquibase formatted sql
--changeset ujjawal.singh@impactanalytics.co:po_master_errored stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for po_master_errored

CREATE TABLE IF NOT EXISTS inventory_smart.po_master_errored (
    po_id varchar NOT NULL,
    receipt_id varchar NOT NULL,
    po_type varchar NULL,
    product_code varchar NOT NULL,
    ordered_quantity int4 NULL,
    method_of_allocation varchar NULL,
    error_code int4 NULL,
    CONSTRAINT pk_po_master_errored PRIMARY KEY (po_id, receipt_id, product_code)
);