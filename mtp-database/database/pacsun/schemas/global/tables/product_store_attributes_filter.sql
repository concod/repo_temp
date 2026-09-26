--liquibase formatted sql
--changeset sreevathsa.sp@impactanalytics.co:product_store_attributes_filter_3 stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:pacsun_product_store_attributes_filter
--comment: initial changeset for product_store_attributes_filter_1

CREATE TABLE if not exists "global".product_store_attributes_filter (
	psa_code text NOT NULL,
	l0_name text NULL,
	store_code text NOT NULL,
	psa_name varchar NULL,
	CONSTRAINT product_store_attributes_filter_pk PRIMARY KEY (psa_code, store_code),
	CONSTRAINT product_store_attributes_filter_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS product_store_attributes_filter_l0_name_idx ON global.product_store_attributes_filter USING btree (l0_name);


--changeset sreevathsa.sp@impactanalytics.co:adding_l1_name_product_store_attributes_filter_v3 stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:pacsun_adding_l1_name_product_store_attributes_filter_v1
--comment: changeset for adding_l1_name_product_store_attributes_filter_v1
ALTER TABLE "global".product_store_attributes_filter ADD COLUMN IF NOT EXISTS l1_name varchar null;


--changeset sreevathsa.sp@impactanalytics.co:deleting_l1_name_product_store_attributes_filter_v2 stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:pacsun_deleting_l1_name_product_store_attributes_filter
--comment: changeset for deleting_l1_name_product_store_attributes_filter_v1
ALTER TABLE "global".product_store_attributes_filter DROP COLUMN IF EXISTS l1_name;

--changeset linu.nazil@impactanalytics.co:product_store_attributes_filter_v4 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding store_hierarchy_level column
ALTER TABLE global.product_store_attributes_filter ADD COLUMN IF NOT EXISTS store_hierarchy_level text[] DEFAULT ARRAY[]::text[];
