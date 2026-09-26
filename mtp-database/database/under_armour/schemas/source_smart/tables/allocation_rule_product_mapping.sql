--liquibase formatted sql
--changeset liquibase:allocation_rule_product_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for allocation_rule_product_mapping
CREATE TABLE source_smart.allocation_rule_product_mapping (
	rule_id int4 NOT NULL,
	rule_code text NULL,
	product_code varchar(50) NOT NULL,
	rcl_id int4 NULL,
	rcl_priority int4 NULL,
	CONSTRAINT allocation_rule_product_mapping_pkey PRIMARY KEY (rule_id, product_code)
);
--changeset zainab.firdous@impactanalytics.co allocation_rule_product_mapping_index stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: adding index to allocation_rule_product_mapping
CREATE INDEX idx_arm_product_priority
ON source_smart.allocation_rule_product_mapping(product_code, rcl_priority DESC);

--changeset mayank.mukundam@impactanalytics.co allocation_rule_product_mapping_columns stripComments:false splitStatements:false context:Release_1_2 labels:liquibase_project_start
--comment: adding columns to allocation_rule_product_mapping
ALTER TABLE source_smart.allocation_rule_product_mapping ADD COLUMN is_eligible bool;
ALTER TABLE source_smart.allocation_rule_product_mapping ADD COLUMN prod_updated_at timestamptz;
ALTER TABLE source_smart.allocation_rule_product_mapping ADD COLUMN demand int4;
ALTER TABLE source_smart.allocation_rule_product_mapping ADD COLUMN demand_updated_at timestamptz;

--changeset mayank.mukundam@impactanalytics.co allocation_rule_product_mapping_index stripComments:false splitStatements:false context:Release_1_3 labels:liquibase_project_start
--comment: create index on allocation_rule_product_mapping
CREATE INDEX allocation_rule_product_mapping_rule_id_idx ON source_smart.allocation_rule_product_mapping USING btree (rule_id);

--changeset mayank.mukundam@impactanalytics.co allocation_rule_product_mapping_columns_prod_created stripComments:false splitStatements:false context:Release_1_4 labels:liquibase_project_start
--comment: adding columns to allocation_rule_product_mapping
ALTER TABLE source_smart.allocation_rule_product_mapping ADD COLUMN prod_created_at timestamptz;