--liquibase formatted sql
--changeset chaitanyaprasad.reddy:added_not_exists_condn stripComments:false splitStatements:false context:Release_1_0 labels:added_not_exists_condn
--comment: changed create statement to if not exists syntax
CREATE TABLE IF NOT EXISTS "global".product_store_hierarchy_mapping (
  mapping_key int,
  l0_name VARCHAR,
  l1_name VARCHAR,
  l2_name VARCHAR,
  business_unit VARCHAR,
  group_id VARCHAR,
  channel VARCHAR,
  PRIMARY KEY (mapping_key)
);

--changeset subhash.pophale@impactanalytics.co:product_store_hierarchy_mapping_alter1 stripComments:false splitStatements:false context:Release_1_0 labels:MTP-22383
--comment: Drop primary key product_store_hierarchy_mapping since there is no functional key and Analytics do not immutability on PK
ALTER TABLE "global".product_store_hierarchy_mapping DROP CONSTRAINT product_store_hierarchy_mapping_pkey;