--liquibase formatted sql
--changeset laraib.ahmad:product_attributes_filter_new stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_attributes_filter
CREATE TABLE IF NOT EXISTS "global".product_store_attributes_filter_store_code (
	psa_code text NOT NULL,
	store_code text NOT NULL,
	psa_name varchar NULL,
	l0_name varchar NULL,
	l1_name varchar NULL,
	CONSTRAINT product_store_attributes_filter_store_code_pk_2 PRIMARY KEY (psa_code)
);
CREATE INDEX IF NOT EXISTS product_store_attributes_filter_store_code_l0_name_idx_2 ON global.product_store_attributes_filter_store_code USING btree (l0_name);
CREATE INDEX IF NOT EXISTS product_store_attributes_filter_store_code_l1_name_idx_2 ON global.product_store_attributes_filter_store_code USING btree (l1_name);