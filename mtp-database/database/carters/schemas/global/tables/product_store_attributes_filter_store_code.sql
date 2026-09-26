-- liquibase formatted sql
-- changeset shrinidhi.choragi@impactanalytics.co:product_store_attributes_filter_store_code stripComments:false splitStatements:false context: db_sync labels:product_store_attributes_filter_store_code
-- comment: initial changeset for product_store_attributes_filter_store_code
CREATE TABLE "global".product_store_attributes_filter_store_code (
	psa_code text NOT NULL,
	l0_name text NULL,
	store_code varchar NOT NULL,
	psa_name text NULL,
	CONSTRAINT product_store_attributes_filter_store_code_pk PRIMARY KEY (psa_code, store_code)
);
CREATE INDEX product_store_attributes_filter_store_code_l0_name_idx ON "global".product_store_attributes_filter_store_code (l0_name);