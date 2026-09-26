--liquibase formatted sql
--changeset abhishek.sagar@impactanalytics.co:product_store_hierarchy_mapping_figs stripComments:false splitStatements:false context:Release_1_0 labels:figs_product_store_hierarchy_mapping
--comment: initial changeset for product_store_hierarchy_mapping


CREATE TABLE IF NOT EXISTS "global".product_store_hierarchy_mapping (
  id serial4 PRIMARY KEY,
  l0_name varchar NULL,
  l1_name varchar NULL,
  l2_name varchar NULL,
  l3_name varchar NULL,
  channel varchar NULL
);


--changeset abhishek.sagar@impactanalytics.co:product_store_hierarchy_mapping_figs_add_col stripComments:false splitStatements:false context:Release_1_0 labels:figs_product_store_hierarchy_mapping
--comment: add col to product_store_hierarchy_mapping

alter table "global".product_store_hierarchy_mapping 
add column if not exists channel_name varchar null;