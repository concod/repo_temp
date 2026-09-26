--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_latest_store_inventory_agg_10 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_latest_store_inventory_agg_10
---DDL

DROP TABLE IF EXISTS base_pricing.bp_latest_store_inventory_agg CASCADE;
CREATE TABLE IF NOT EXISTS
base_pricing.bp_latest_store_inventory_agg (
    store_id int4 NOT NULL,
    "date" date NULL,
    oh int4 NULL,
    it int4 NULL,
    oo int4 NULL,
    total_inventory int4 NULL,
    CONSTRAINT bp_latest_store_inventory_agg_pkey PRIMARY KEY (store_id),
    CONSTRAINT fk_product FOREIGN KEY (store_id) REFERENCES base_pricing.bp_store_master(store_id)
);