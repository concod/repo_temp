--liquibase formatted sql
--changeset liquibase:rcl_product_mapping_product_store_rule stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for rcl_product_mapping_product_store_rule
CREATE TABLE IF NOT EXISTS "global".rcl_product_mapping_product_store_rule (
	rule_code serial4 NOT NULL,
	rcl_code int4 NOT NULL,
	rcl_dimension jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT rule_pk PRIMARY KEY (rcl_code, rule_code),
	CONSTRAINT rule_uk UNIQUE (rcl_code, rcl_dimension),
	CONSTRAINT rcl_product_mapping_product_store_rule_fk FOREIGN KEY (rcl_code) REFERENCES "global".rcl_master(rcl_code) ON DELETE RESTRICT
)
PARTITION BY LIST (rcl_code);
CREATE INDEX rcl_product_mapping_product_store_rule_hash ON global.rcl_product_mapping_product_store_rule USING hash (md5((rcl_dimension)::text));
