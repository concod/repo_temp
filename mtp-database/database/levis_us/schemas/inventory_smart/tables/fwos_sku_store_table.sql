--liquibase formatted sql
--changeset liquibase:fwos_sku_store_table stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for fwos_sku_store_table
CREATE TABLE inventory_smart.fwos_sku_store_table (
    product_code text NOT NULL,
    store_code text NOT NULL,
    oh int4 NULL,
    it int4 NULL,
    oo int4 NULL,
    total_inv int4 NULL,
    sales int4 NULL,
    first_sales_date date NULL,
    last_sales_date date NULL,
    weeks int4 NULL,
    ros float4 NULL,
    wos_oh float4 NULL,
    wos_oh_it float4 NULL,
    wos_oh_oo float4 NULL,
    wos_oh_oo_it float4 NULL,
    CONSTRAINT fwos_sku_store_pk PRIMARY KEY (product_code, store_code)
);