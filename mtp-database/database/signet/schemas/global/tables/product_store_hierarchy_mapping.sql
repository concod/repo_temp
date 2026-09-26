--liquibase formatted sql
--changeset chaitanyaprasad.reddy@impactanalytics.co:mtp-20764 stripComments:false splitStatements:false context:Release_1_0 labels:mtp-20764
--comment: initial changeset for product_store_hierarchy_mapping for signet
CREATE TABLE "global".product_store_hierarchy_mapping (
  l0_name VARCHAR,
  l1_name VARCHAR,
  l2_name VARCHAR,
  product_channel_name VARCHAR,
  Store_channel_description VARCHAR,
  channel VARCHAR
);

--changeset ashish@impactanalytics.co:product_store_hierarchy_mapping_pk stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_store_hierarchy_mapping_pk
ALTER TABLE global.product_store_hierarchy_mapping ADD COLUMN id serial4 PRIMARY KEY;

--changeset akshay@impactanalytics.co:product_store_hierarchy_mapping_access stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_store_hierarchy_mapping_access
ALTER TABLE global.product_store_hierarchy_mapping ADD COLUMN IF NOT EXISTS store_access_hierarchy VARCHAR(255);
ALTER TABLE global.product_store_hierarchy_mapping ADD COLUMN IF NOT EXISTS product_access_hierarchy VARCHAR(255);