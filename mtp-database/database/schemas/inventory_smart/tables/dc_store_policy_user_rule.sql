--liquibase formatted sql
--changeset tarun.tyagi:rcl_dc_store_policy_1 stripComments:false splitStatements:false context:MTP-110834 labels:MTP-110834
--comment: MTP-110834 add rule_expression column to dc_store_policy_user_rule table

CREATE TABLE IF NOT EXISTS inventory_smart.dc_store_policy_user_rule (
	rule_code serial4 NOT NULL,
	rule_name varchar NOT NULL,
	"values" jsonb NOT NULL,
	rule_type varchar NOT NULL,
	is_deleted bool DEFAULT false NOT NULL,
	created_by int4 NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_by int4 NULL,
	updated_at timestamptz NULL,
	is_deletable bool DEFAULT false NOT NULL,
	CONSTRAINT dc_store_policy_user_rule_pkey PRIMARY KEY (rule_code),
	CONSTRAINT unique_rule_name_rule_type UNIQUE (rule_name, rule_type)
);

--changeset liquibase:add_rule_expression_column stripComments:false splitStatements:false
--comment: Add rule_expression column to prefix expression (ex: ["OR", "AND", "current_dos", "cut_off_dos", "minimum_dc_inventory"])

ALTER TABLE inventory_smart.dc_store_policy_user_rule
ADD COLUMN IF NOT EXISTS rule_expression text[] NULL;