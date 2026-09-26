--liquibase formatted sql
--changeset liquibase:lw_sales_kpi_schema stripComments:false splitStatements:false context:Release_1_0 labels:0060
--comment: initial changeset for lw_sales_kpi schema

CREATE TABLE inventory_smart.lw_sales_kpi (
    l0_code varchar NOT NULL,
    l0_name varchar NOT NULL,
    l1_name varchar NOT NULL,
    l3_name varchar NOT NULL,
    l4_name varchar NOT NULL,
    primary_sku varchar NOT NULL,
    product_code varchar NOT NULL,
    store_code varchar NOT NULL,
    date date NOT NULL,
    qty INT4 NULL,
    cost float4 NULL
    );

-- inventory_smart.lw_sales_kpi foreign keys
ALTER TABLE
    inventory_smart.lw_sales_kpi
ADD
    CONSTRAINT lw_sales_kpi_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code)
    ON DELETE CASCADE;

ALTER TABLE
    inventory_smart.lw_sales_kpi
ADD
    CONSTRAINT lw_sales_kpi_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code)
    ON DELETE CASCADE;

ALTER TABLE inventory_smart.lw_sales_kpi ADD CONSTRAINT lw_sales_kpi_un UNIQUE (product_code,store_code,date);

