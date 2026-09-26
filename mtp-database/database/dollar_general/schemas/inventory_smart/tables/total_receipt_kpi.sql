--liquibase formatted sql
--changeset liquibase:total_receipt_kpi_schema stripComments:false splitStatements:false context:Release_1_0 labels:0080
--comment: initial changeset for total_receipt_kpi schema

CREATE TABLE inventory_smart.total_receipt_kpi (
    l0_code varchar NOT NULL,
    l0_name varchar NOT NULL,
    l1_name varchar NOT NULL,
    l3_name varchar NOT NULL,
    l4_name varchar NOT NULL,
    primary_sku varchar NOT NULL,
    product_code varchar NOT NULL,
    receive_date date NOT NULL,
    qty	FLOAT4 NULL,
    cost FLOAT4 NULL
    );

-- inventory_smart.total_receipt_kpi foreign keys
ALTER TABLE
    inventory_smart.total_receipt_kpi
ADD
    CONSTRAINT total_receipt_kpi_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code)
    ON DELETE CASCADE;

ALTER TABLE inventory_smart.total_receipt_kpi ADD CONSTRAINT total_receipt_kpi_un UNIQUE (product_code,receive_date);

