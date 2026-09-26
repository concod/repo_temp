--liquibase formatted sql
--changeset gauri.nair@impactanalytics.co:product_store_hierarchy_mapping_tillys stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_store_hierarchy_mapping

CREATE TABLE if not exists "global".product_store_hierarchy_mapping (
	mapping_key int4 NOT NULL,
	l0_name varchar NULL,
	l1_name varchar NULL,
	l2_name varchar NULL,
	business_unit varchar NULL,
	group_id varchar NULL,
	channel varchar NULL,
	CONSTRAINT product_store_hierarchy_mapping_pkey PRIMARY KEY (mapping_key)
);

--changeset gauri.nair@impactanalytics.co:product_store_hierarchy_mapping_tillys_alter stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts_1
--comment: alter table changeset for product_store_hierarchy_mapping
alter table "global".product_store_hierarchy_mapping add column if not exists l3_name varchar null, 
add column if not exists s0_name varchar null;

--changeset gauri.nair@impactanalytics.co:product_store_hierarchy_mapping_tillys_alter_datatype stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts_11
--comment: alter column datatype changeset for product_store_hierarchy_mapping
ALTER TABLE "global".product_store_hierarchy_mapping
DROP CONSTRAINT if exists product_store_hierarchy_mapping_pkey;
ALTER TABLE "global".product_store_hierarchy_mapping
DROP COLUMN if exists id;
ALTER TABLE "global".product_store_hierarchy_mapping
ADD COLUMN if not exists id serial4 NOT NULL;
ALTER TABLE "global".product_store_hierarchy_mapping
ADD CONSTRAINT product_store_hierarchy_mapping_pkey PRIMARY KEY (id);

