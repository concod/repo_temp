--liquibase formatted sql
--changeset gauri.nair@impactanalytics.co:product_store_attributes_filter_version stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts
--comment: initial changeset for product_store_attributes_filter_version
CREATE TABLE "global".product_store_attributes_filter_version (
	version_code int4 NOT NULL,
	psa_code text NOT NULL,
	l0_name text NULL,
	store_code text NOT NULL,
	psa_name varchar NULL,
	l1_name varchar NOT NULL,
	l2_name varchar NULL,
	l3_name varchar NULL,
	store_hierarchy_level _text DEFAULT ARRAY[]::text[] NULL,
	CONSTRAINT product_store_attributes_filter_version_pk PRIMARY KEY (psa_code, store_code, version_code),
	CONSTRAINT product_store_attributes_filter_version_code_fk FOREIGN KEY (version_code) REFERENCES "global"."versioning"(version_code) ON DELETE CASCADE,
	CONSTRAINT product_store_attributes_filter_version_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE
)
PARTITION BY LIST (version_code);

--changeset gauri.nair@impactanalytics.co:product_store_attributes_filter_version_2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts_2
--comment: alter table changeset for product_store_attributes_filter_version
alter table "global".product_store_attributes_filter_version add column if not exists store_category varchar null, 
add column if not exists geo_region varchar null;

--changeset gauri.nair@impactanalytics.co:product_store_attributes_filter_version_3 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts_3
--comment: alter table changeset for product_store_attributes_filter_version_3
ALTER TABLE "global".product_store_attributes_filter_version 
RENAME COLUMN l0_name TO department;

ALTER TABLE "global".product_store_attributes_filter_version 
RENAME COLUMN l1_name TO subdepartment;

ALTER TABLE "global".product_store_attributes_filter_version 
RENAME COLUMN l2_name TO class;

ALTER TABLE "global".product_store_attributes_filter_version 
RENAME COLUMN l3_name TO subclass;

--changeset gauri.nair@impactanalytics.co:product_store_attributes_filter_version_4 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts_4
--comment: alter table changeset for product_store_attributes_filter_version_4
ALTER TABLE "global".product_store_attributes_filter_version add column if not exists l0_name varchar,
add column if not exists l1_name varchar,
add column if not exists l2_name varchar,
add column if not exists l3_name varchar;

--changeset gauri.nair@impactanalytics.co:product_store_attributes_filter_version_5 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts_5
--comment: alter table changeset for product_store_attributes_filter_version_5
alter table "global".product_store_attributes_filter_version alter column l3_name SET NOT NULL;

-- Step 1: Drop existing primary key
ALTER TABLE "global".product_store_attributes_filter_version
DROP CONSTRAINT product_store_attributes_filter_version_pk;

-- Step 2: Recreate primary key including l3_name
ALTER TABLE "global".product_store_attributes_filter_version
ADD CONSTRAINT product_store_attributes_filter_version_pk
PRIMARY KEY (psa_code, store_code, version_code, l3_name);


--changeset gauri.nair@impactanalytics.co:product_store_attributes_filter_version_6 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts_6
--comment: alter table changeset for product_store_attributes_filter_version_6
ALTER TABLE "global".product_store_attributes_filter_version DROP COLUMN department cascade;
ALTER TABLE "global".product_store_attributes_filter_version DROP COLUMN subdepartment cascade;
ALTER TABLE "global".product_store_attributes_filter_version DROP COLUMN "class" cascade;
ALTER TABLE "global".product_store_attributes_filter_version DROP COLUMN subclass cascade;

--changeset anish.a@impactanalytics.co:product_store_attributes_filter_version_7 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts_7
--comment: alter table changeset for product_store_attributes_filter_version_7
CREATE INDEX if not exists idx_psaf_version_hierarchy_store
ON global.product_store_attributes_filter_version(version_code, l0_name, l1_name, l2_name, l3_name, store_code);

