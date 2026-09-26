--liquibase formatted sql
--changeset kumaran.k@impactanalytics.co:product_store_hierarchy_mapping_v1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_store_hierarchy_mapping_v1

DROP TABLE IF EXISTS "global".product_store_hierarchy_mapping;
CREATE TABLE "global".product_store_hierarchy_mapping (
    l0_name text NULL,
    l1_name TEXT NULL,
    manufacturer_cuq TEXT NULL,
    channel text NULL,
    CONSTRAINT pk_prod_store_hier_map PRIMARY KEY (l0_name, l1_name, manufacturer_cuq)
    );
CREATE INDEX prod_store_hier_map_idx ON "global".product_store_hierarchy_mapping USING btree (manufacturer_cuq);