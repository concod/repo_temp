--liquibase formatted sql
--changeset liquibase:inventory_kpi_schema stripComments:false splitStatements:false context:Release_1_0 labels:0050
--comment: initial changeset for inventory_kpi schema

CREATE TABLE inventory_smart.inventory_kpi (
    l0_code varchar NOT NULL,
    l0_name varchar NOT NULL,
    l1_name varchar NOT NULL,
    l3_name varchar NOT NULL,
    l4_name varchar NOT NULL,
    primary_sku varchar NOT NULL,
    product_code varchar NOT NULL,
    store_code varchar NOT NULL,
    date date NOT NULL,
    store_type varchar NOT NULL,
    oh FLOAT4 NULL,
    it FLOAT4 NULL,
    oo FLOAT4 NULL,
    total_inventory FLOAT4 NULL,
    cost FLOAT4 NULL
    );

-- inventory_smart.inventory_kpi foreign keys
ALTER TABLE
    inventory_smart.inventory_kpi
ADD
    CONSTRAINT inventory_kpi_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code)
    ON DELETE CASCADE;

ALTER TABLE
    inventory_smart.inventory_kpi
ADD
    CONSTRAINT inventory_kpi_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code)
    ON DELETE CASCADE;

ALTER TABLE inventory_smart.inventory_kpi ADD CONSTRAINT inventory_kpi_un UNIQUE (product_code,store_code,date);

