--liquibase formatted sql
--changeset ujjawal.singh@impactanalytics.co:latest_inventory stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: latest_inventory

CREATE TABLE IF NOT EXISTS inventory_smart.latest_inventory (
    product_code text NOT NULL,
    store_code text NOT NULL,
    "date" date NOT NULL,
    it float4 NULL,
    oh float4 NULL,
    oo float4 NULL,
    channel text NULL,
    CONSTRAINT latest_inventory_un UNIQUE (product_code, store_code, "date"),
    CONSTRAINT latest_inventory_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE,
    CONSTRAINT latest_inventory_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE
);
