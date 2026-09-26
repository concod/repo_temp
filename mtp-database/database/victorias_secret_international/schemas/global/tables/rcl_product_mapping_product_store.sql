--liquibase formatted sql
--changeset liquibase:rcl_product_mapping_product_store stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for rcl_product_mapping_product_store
CREATE TABLE IF NOT EXISTS "global".rcl_product_mapping_product_store (
	rcl_code int4 NOT NULL,
	rule_code int4 NOT NULL,
	psa_code varchar NOT NULL,
	validity datemultirange NULL,
	psa_name varchar NULL,
	child_sku varchar NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz NULL,
	updated_by int4 NULL,
	created_by int4 NULL,
	store_tier varchar NULL,
	CONSTRAINT rcl_product_mapping_product_store_uk UNIQUE (rcl_code,rule_code,psa_code),
	CONSTRAINT rcl_product_mapping_product_store_created_by_fk FOREIGN KEY (created_by) REFERENCES "global".user_master(user_code) ON DELETE RESTRICT,
	CONSTRAINT rcl_product_mapping_product_store_fk FOREIGN KEY (rcl_code,rule_code) REFERENCES "global".rcl_product_mapping_product_store_rule(rcl_code,rule_code) ON DELETE CASCADE,
	CONSTRAINT rcl_product_mapping_product_store_updated_by_fk FOREIGN KEY (updated_by) REFERENCES "global".user_master(user_code) ON DELETE RESTRICT
)
PARTITION BY LIST (rcl_code);

--changeset harshitha.sv@impactanalytics.co:adding_index stripComments:false splitStatements:false context:MTP-92763 labels:liquibase_project_start
--comment: adding index
CREATE INDEX rcl_product_mapping_product_store_rule_code_idx ON global.rcl_product_mapping_product_store USING btree (rule_code, psa_name);
