--liquibase formatted sql
--changeset liquibase:store_clusters stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_clusters
CREATE TABLE inventory_smart.store_clusters (
	store_code varchar NOT NULL,
	"cluster" varchar NOT NULL,
	cluster_hierarchy jsonb NOT NULL DEFAULT '{}'::jsonb
);
ALTER TABLE inventory_smart.store_clusters ADD CONSTRAINT store_clusters_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE;
