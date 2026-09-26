--liquibase formatted sql
--changeset anish.a@impactanalytics.co:store_clusters stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts
--comment: initial changeset for store_clusters


CREATE TABLE if not exists inventory_smart.store_clusters (
    store_code varchar NOT NULL,
    "cluster" varchar NOT NULL,
    cluster_hierarchy jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT store_clusters_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE
);

--changeset anish.a@impactanalytics.co:store_clusters_pk stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts_2
--comment: alter table changeset for store_clusters_pk

ALTER TABLE inventory_smart.store_clusters
ADD CONSTRAINT store_clusters_pk
PRIMARY KEY (store_code, cluster_hierarchy);