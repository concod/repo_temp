--liquibase formatted sql
--changeset swapnil.bhange:product_store_attributes_filter_version stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_store_attributes_filter_version

-- "global".product_store_attributes_filter_version definition
-- Drop table
-- DROP TABLE "global".product_store_attributes_filter_version;

CREATE TABLE "global".product_store_attributes_filter_version (
	version_code int4 NOT NULL,
	psa_code text NOT NULL,
	l0_name text NULL,
	store_code text NOT NULL,
	psa_name varchar NULL,
	l1_name varchar NULL,
	l2_name varchar NULL,
	l3_name varchar NULL,
	l4_name varchar NULL,
	CONSTRAINT product_store_attributes_filter_version_pk PRIMARY KEY (version_code, psa_code, store_code)
)
PARTITION BY LIST (version_code);
CREATE INDEX product_store_attributes_filter_version_l0_name_idx ON global.product_store_attributes_filter_version USING btree (l0_name);


-- "global".product_store_attributes_filter_version foreign keys

ALTER TABLE "global".product_store_attributes_filter_version ADD CONSTRAINT product_store_attributes_filter_version_code_fk FOREIGN KEY (version_code) REFERENCES "global"."versioning"(version_code) ON DELETE CASCADE;
ALTER TABLE "global".product_store_attributes_filter_version ADD CONSTRAINT product_store_attributes_filter_version_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE;

--changeset swapnil.bhange:product_store_attributes_filter_version_new_index stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_store_attributes_filter_version_new_index
CREATE INDEX psaf_l0_l1_l2_l3_l4_idx ON "global".product_store_attributes_filter_version USING btree (l0_name, l1_name, l2_name, l3_name, l4_name);


--changeset swapnil.bhange:product_store_attributes_filter_version_new_cosntraint stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_store_attributes_filter_version_new_constraint

-- Drop the constraint if it exists
ALTER TABLE "global".product_store_attributes_filter_version DROP CONSTRAINT IF EXISTS product_store_attributes_filter_version_pk;

-- Add the primary key constraint
ALTER TABLE "global".product_store_attributes_filter_version ADD CONSTRAINT product_store_attributes_filter_version_pk PRIMARY KEY (version_code, l0_name, l4_name, psa_code, store_code);

--changeset swapnil.bhange:product_store_attributes_filter_version_v3 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_store_attributes_filter_version_v3
ALTER TABLE "global".product_store_attributes_filter_version ADD COLUMN IF NOT EXISTS range_name varchar NULL;

-- Drop the existing index
DROP INDEX IF EXISTS "global".psaf_l0_l1_l2_l3_l4_idx;

-- Drop the existing primary key constraint
ALTER TABLE "global".product_store_attributes_filter_version 
DROP CONSTRAINT IF EXISTS product_store_attributes_filter_version_pk;

-- Add the new primary key constraint
ALTER TABLE "global".product_store_attributes_filter_version 
ADD CONSTRAINT product_store_attributes_filter_version_pk 
PRIMARY KEY (version_code, l0_name, l1_name, range_name, store_code);

-- Create the new index
CREATE INDEX IF NOT EXISTS product_store_attributes_filter_l0_l1_idx 
ON "global".product_store_attributes_filter_version (l0_name, l1_name);

-- Dropping columns
ALTER TABLE "global".product_store_attributes_filter_version DROP COLUMN IF EXISTS l2_name;
ALTER TABLE "global".product_store_attributes_filter_version DROP COLUMN IF EXISTS l3_name;
ALTER TABLE "global".product_store_attributes_filter_version DROP COLUMN IF EXISTS l4_name;


--changeset sreenivas.s@impactanalytics.co:product_store_attributes_filter_store_cluster stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_store_attributes_filter_store_cluster
ALTER TABLE global.product_store_attributes_filter_version ADD COLUMN IF NOT EXISTS store_cluster varchar NULL;

--changeset linu.nazil@impactanalytics.co:product_store_attributes_filter_version_v4 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding store_hierarchy_level column
ALTER TABLE global.product_store_attributes_filter_version ADD COLUMN IF NOT EXISTS store_hierarchy_level text[] DEFAULT ARRAY[]::text[];

--changeset linu.nazil@impactanalytics.co:product_store_attributes_filter_version_v5 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding store_hierarchy_level column
ALTER TABLE "global".product_store_attributes_filter_version 
DROP CONSTRAINT IF EXISTS product_store_attributes_filter_version_pk;

ALTER TABLE "global".product_store_attributes_filter_version 
ADD CONSTRAINT product_store_attributes_filter_version_pk 
PRIMARY KEY (version_code, l0_name, l1_name, range_name, psa_code, store_code);