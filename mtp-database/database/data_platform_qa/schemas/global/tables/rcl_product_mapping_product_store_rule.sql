--liquibase formatted sql
--changeset ashish@iimpactanalytics.co:rcl_product_mapping_product_store_rule stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for rcl_product_mapping_product_store_rule
CREATE TABLE "global".rcl_product_mapping_product_store_rule (
	rule_code serial4 NOT NULL,
	rcl_code int4 NOT NULL,
	rcl_dimension jsonb DEFAULT '{}'::jsonb NOT null,
	CONSTRAINT rule_pk PRIMARY KEY (rcl_code, rule_code)
)
PARTITION BY LIST (rcl_code);
ALTER TABLE "global".rcl_product_mapping_product_store_rule ADD CONSTRAINT rcl_product_mapping_product_store_rule_fk FOREIGN KEY (rcl_code) REFERENCES global.rcl_master(rcl_code) ON DELETE RESTRICT;

--changeset ashish@iimpactanalytics.co:rcl_product_mapping_product_store_rule_uk_idx stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for rcl_product_mapping_product_store_rule_uk_idx
ALTER TABLE "global".rcl_product_mapping_product_store_rule ADD CONSTRAINT rule_uk UNIQUE (rcl_code, rcl_dimension);
CREATE INDEX rcl_product_mapping_product_store_rule_hash ON global.rcl_product_mapping_product_store_rule USING hash (md5((rcl_dimension)::text));
