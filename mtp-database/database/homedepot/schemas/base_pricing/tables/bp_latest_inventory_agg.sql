--liquibase formatted sql
--changeset krithika.s@impactanalytics.co:bp_latest_inventory_agg_v1 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_latest_inventory_agg_v1

DROP TABLE IF EXISTS base_pricing.bp_latest_inventory_agg CASCADE;
CREATE TABLE IF NOT EXISTS
base_pricing.bp_latest_inventory_agg (
    product_id int4 NOT NULL,
    store_id int4 NOT NULL,
    "date" date NULL,
    oh int4 NULL,
    it int4 NULL,
    oo int4 NULL,
    total_inventory int4 NULL,
    CONSTRAINT bp_latest_inventory_agg_pkey PRIMARY KEY (product_id, store_id),
    CONSTRAINT fk_product FOREIGN KEY (product_id) REFERENCES base_pricing.bp_product_master(product_id),
    CONSTRAINT fk_store FOREIGN KEY (store_id) REFERENCES base_pricing.bp_store_master(store_id)
);