--liquibase formatted sql
--changeset draksharapu.rajesh:store_clusters_sync_test stripComments:false splitStatements:false context:Release_1.1 labels:store_clusters_sync
--comment: Synchronizing store_clusters table with UAT schema

CREATE TABLE   inventory_smart.store_clusters (
    store_code varchar NOT NULL,
    "cluster" varchar NOT NULL,
    cluster_hierarchy jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT store_clusters_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE
);
