--liquibase formatted sql
--changeset jagadeesh.pondara@impactanalytics.co::product_store_hierarchy_mapping stripComments:false splitStatements:false context:Release_1_0 labels
--comment: initial changeset for product_store_hierarchy_mapping for VS

CREATE TABLE "global".product_store_hierarchy_mapping (
	l0_name varchar(50) NOT NULL,
	l1_name varchar(50) NOT NULL,
	l2_name varchar(50) NOT NULL,
	channel varchar(50) NOT NULL,
	CONSTRAINT product_store_hierarchy_mapping_un UNIQUE (l0_name, l1_name, l2_name, channel)
);

--changeset kamuju.mahaveer:product_store_hierarchy_mapping_v1 stripComments:false splitStatements:false context:VS_inv_smart labels:VS-503
--comment: Updated Schema for product_store_hierarchy_mapping
ALTER TABLE "global".product_store_hierarchy_mapping DROP CONSTRAINT IF EXISTS product_store_hierarchy_mapping_un;
ALTER TABLE "global".product_store_hierarchy_mapping DROP COLUMN IF EXISTS l1_name;
ALTER TABLE "global".product_store_hierarchy_mapping ADD CONSTRAINT product_store_hierarchy_mapping_un UNIQUE (l0_name, l2_name, channel);



--changeset ashish@impactanalytics.co:product_store_hierarchy_mapping_pk stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_store_hierarchy_mapping_pk
ALTER TABLE global.product_store_hierarchy_mapping ADD COLUMN id serial4 PRIMARY KEY;
