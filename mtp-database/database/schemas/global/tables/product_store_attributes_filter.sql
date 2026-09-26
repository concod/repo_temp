--liquibase formatted sql
--changeset linu.nazil@impactanalytics.co:product_store_attributes_filter stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_store_attributes_filter
CREATE TABLE "global".product_store_attributes_filter (
	psa_code text NOT NULL,
	l0_name text NULL,
	store_code text NOT NULL,
	psa_name int4 NULL,
	CONSTRAINT product_store_attributes_filter_pk PRIMARY KEY (psa_code, store_code)
);
CREATE INDEX product_store_attributes_filter_l0_name_idx ON "global".product_store_attributes_filter (l0_name);

--changeset arnab.nandy@impactanalytics.co:product_store_attributes_filter_adding_fk_store_code stripComments:false splitStatements:false context:Release_1_0 labels:MTP-41716
--comment: adding foreign key reference with store_code
ALTER TABLE "global".product_store_attributes_filter ADD CONSTRAINT product_store_attributes_filter_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE;

--changeset linu.nazil@impactanalytics.co:product_store_attributes_filter_dg_v1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: psa_name to varchar from int
ALTER TABLE "global".product_store_attributes_filter ALTER COLUMN psa_name TYPE varchar;

--changeset linu.nazil@impactanalytics.co:product_store_attributes_filter_v3 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding store_hierarchy_level column
ALTER TABLE global.product_store_attributes_filter ADD COLUMN IF NOT EXISTS store_hierarchy_level text[] DEFAULT ARRAY[]::text[];
