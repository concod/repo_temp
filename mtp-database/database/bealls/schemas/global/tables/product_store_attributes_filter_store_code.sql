--liquibase formatted sql
--changeset vikash.kumar@impactanalytics.co:product_store_attributes_filter_store_code stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_store_attributes_filter_store_code


CREATE TABLE IF NOT EXISTS "global".product_store_attributes_filter_store_code (
	psa_code text NOT NULL,
	l0_name text NULL,
	store_code text NOT NULL,
	psa_name varchar NULL,
	CONSTRAINT product_store_attributes_filter_store_code_pk PRIMARY KEY (psa_code)
);
CREATE INDEX IF NOT EXISTS product_store_attributes_filter_store_code_l0_name_idx ON global.product_store_attributes_filter_store_code USING btree (l0_name);