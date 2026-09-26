--liquibase formatted sql
--changeset nischay.p@impactanalytics.co:product_store_attributes_filter_store_code_version stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts_product_store_attributes_filter_store_code_version
--comment: initial changeset for product_store_attributes_filter_store_code_version

CREATE TABLE "global".product_store_attributes_filter_store_code_version (
	version_code int4 NOT NULL,
	psa_code text NOT NULL,
	l0_name text NULL,
	store_code text NOT NULL,
	psa_name varchar NULL,
	s0_name varchar NULL,
	s1_name varchar NULL,
	s2_name varchar NULL,
	CONSTRAINT product_store_attributes_filter_store_code_version_pk PRIMARY KEY (psa_code, version_code),
	CONSTRAINT product_store_attributes_filter_store_code_version_fk FOREIGN KEY (version_code) REFERENCES "global"."versioning"(version_code) ON DELETE CASCADE
)
PARTITION BY LIST (version_code);