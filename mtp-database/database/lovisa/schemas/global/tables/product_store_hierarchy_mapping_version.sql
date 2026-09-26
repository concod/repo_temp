--liquibase formatted sql
--changeset swapnil.bhange:product_store_hierarchy_mapping_version stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_store_hierarchy_mapping_version

-- "global".product_store_hierarchy_mapping_version definition
-- Drop table
-- DROP TABLE "global".product_store_hierarchy_mapping_version;

CREATE TABLE "global".product_store_hierarchy_mapping_version (
	l0_name varchar NULL,
	l1_name varchar NULL,
	l2_name varchar NULL,
	l3_name varchar NULL,
	s0_name varchar NULL,
	s1_name varchar NULL,
	channel varchar NULL,
	version_code int4 NOT NULL
)
PARTITION BY LIST (version_code);
CREATE INDEX product_store_hierarchy_mapping_version_l0_name_idx ON global.product_store_hierarchy_mapping_version USING btree (l0_name);


ALTER TABLE "global".product_store_hierarchy_mapping_version ADD CONSTRAINT product_store_hierarchy_mapping_version_code_fk FOREIGN KEY (version_code) REFERENCES "global"."versioning"(version_code) ON DELETE CASCADE;

--changeset swapnil.bhange@impactanalytics.co:product_store_hierarchy_mapping_version_v7 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_store_hierarchy_mapping_version_v7
ALTER TABLE global.product_store_hierarchy_mapping_version
ADD COLUMN IF NOT EXISTS id serial4 NOT NULL;

ALTER TABLE "global".product_store_hierarchy_mapping_version
ADD CONSTRAINT product_store_hierarchy_mapping_pkey_V1 PRIMARY KEY (id,version_code);
