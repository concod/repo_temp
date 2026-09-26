-- liquibase formatted sql
-- changeset aiyush.prasad@impactanalytics.co:final_allocations_results stripComments:false splitStatements:false context: db_sync labels:final_allocations_results
-- comment: initial changeset for final_allocations_results

CREATE TABLE IF NOT EXISTS inventory_smart.final_allocations_results (
    allocation_code varchar NOT NULL,
    original_product_code varchar NULL,
    supersession_product_code varchar NOT NULL,
    brand varchar NULL,
    inner_pack_units int4 NULL,
    ticket_type int4 NULL,
    store_code varchar NOT NULL,
    dc_code varchar NOT NULL,
    updated_by int4 NULL,
    created_at date NULL,
    quantity int4 NULL,
    allocation_type text NULL,
    po_asn_id varchar NULL,
    PRIMARY KEY (allocation_code, store_code, dc_code, supersession_product_code,created_at)
    )
PARTITION BY RANGE (created_at);