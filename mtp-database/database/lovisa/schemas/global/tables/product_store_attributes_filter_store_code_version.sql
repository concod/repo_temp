--liquibase formatted sql
--changeset swapnil.bhange:product_store_attributes_filter_store_code_version stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_store_attributes_filter_store_code_version

-- "global".product_store_attributes_filter_store_code_version definition
-- Drop table
-- DROP TABLE "global".product_store_attributes_filter_store_code_version;

CREATE TABLE "global".product_store_attributes_filter_store_code_version (
	version_code int4 NOT NULL,
	psa_code text NOT NULL,
	l0_name text NULL,
	store_code text NOT NULL,
	psa_name varchar NULL,
	CONSTRAINT product_store_attributes_filter_store_code_version_pk PRIMARY KEY (version_code, psa_code)
)
PARTITION BY LIST (version_code);
CREATE INDEX product_store_attributes_filter_store_code_version_l0_name_idx ON global.product_store_attributes_filter_store_code_version USING btree (l0_name);

