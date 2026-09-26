--liquibase formatted sql
--changeset swapnil.bhange:store_clusters stripComments:false splitStatements:false context:Release_1_0 labels:name
--comment: initial changeset for store_clusters
CREATE TABLE inventory_smart.store_clusters (
    store_code varchar NOT NULL, 
    "cluster" varchar NOT NULL,  
    cluster_hierarchy jsonb NOT NULL
    );

-- inventory_smart.lw_sales_kpi foreign keys
ALTER TABLE
    inventory_smart.store_clusters
ADD
    CONSTRAINT store_clusters_store_fk_2 FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code)
    ON DELETE CASCADE;

ALTER TABLE inventory_smart.store_clusters ADD CONSTRAINT store_clusters_un UNIQUE (store_code,cluster,cluster_hierarchy);

--changeset linu.nazil:store_clusters stripComments:false splitStatements:false context:Release_1_0 labels:name
--comment: new changeset for store_clusters
create index store_cluster_l0_sc_idx on inventory_smart.store_clusters((cluster_hierarchy->>'l0_name'), store_code);