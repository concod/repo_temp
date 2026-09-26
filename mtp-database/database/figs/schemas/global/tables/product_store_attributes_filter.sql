--liquibase formatted sql
--changeset linu.nazil@impactanalytics.co:product_store_attributes_filter_figs stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_store_attributes_filter
CREATE TABLE IF NOT EXISTS "global".product_store_attributes_filter (
	psa_code text NOT NULL,
	l0_name text NULL,
	store_code text NOT NULL,
	psa_name varchar NULL,
	CONSTRAINT product_store_attributes_filter_pk PRIMARY KEY (psa_code, store_code),
	CONSTRAINT product_attributes_filter_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS product_store_attributes_filter_l0_name_idx ON global.product_store_attributes_filter USING btree (l0_name);



--changeset abhishek.sagar@impactanalytics.co:product_store_attributes_filter_figs_v1 stripComments:false splitStatements:false context:Release_1_0 labels:figs_col_add
--comment: adding li_name column
ALTER TABLE "global".product_store_attributes_filter ADD COLUMN IF NOT EXISTS l1_name varchar NULL;


--changeset abhishek.sagar@impactanalytics.co:product_store_attributes_filter_v_figs stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding store_hierarchy_level column
ALTER TABLE global.product_store_attributes_filter ADD COLUMN IF NOT EXISTS store_hierarchy_level text[] DEFAULT ARRAY[]::text[];
