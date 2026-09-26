--liquibase formatted sql
--changeset kanishka.parashar@impactanalytics.co:store_clusters stripComments:false splitStatements:false context:VS_inv_smart labels:alerts_product_channel_v1
--comment: initial changeset for store_clusters
CREATE TABLE IF NOT EXISTS inventory_smart.store_clusters (
	store_code varchar NOT NULL,
	"cluster" varchar NOT NULL,
	cluster_hierarchy jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT store_clusters_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE
);