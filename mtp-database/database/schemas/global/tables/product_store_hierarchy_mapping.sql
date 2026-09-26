--liquibase formatted sql
--changeset liquibase:product_store_hierarchy_mapping_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_store_hierarchy_mapping
CREATE TABLE "global".product_store_hierarchy_mapping (
  mapping_key int,
  l0_name VARCHAR,
  l1_name VARCHAR,
  l2_name VARCHAR,
  business_unit VARCHAR,
  group_id VARCHAR,
  channel VARCHAR,
  PRIMARY KEY (mapping_key)
);
