--liquibase formatted sql
--changeset srishti.kumari@impactanalytics.co:alerts_product_level_MTP-51967 stripComments:false splitStatements:false context:MTP-51967 labels:mtp-51967
--rule_code type serial4

CREATE TABLE inventory_smart.alloc_rule_master (
	rule_code serial4 NOT NULL,
	rule_name varchar NOT NULL,
	validity daterange NULL,
	is_active bool NOT NULL,
	is_default bool NOT NULL,
	rule_definitions varchar NOT NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_by int4 NULL,
	created_by int4 NULL,
	rule_definitions_jsonb jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT alloc_rule_master_pkey PRIMARY KEY (rule_code),
	CONSTRAINT unique_rule_name UNIQUE (rule_name),
	CONSTRAINT alloc_rule_master_created_by_fk FOREIGN KEY (created_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL,
	CONSTRAINT alloc_rule_master_updated_by_fk FOREIGN KEY (updated_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL
);