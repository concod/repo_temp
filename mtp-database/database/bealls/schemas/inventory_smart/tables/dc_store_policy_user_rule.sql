--liquibase formatted sql
--changeset liquibase:rcl_dc_store_policy stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: MTP-38504 DC Store Policy User Rule table (auto allocation rules, dc store rules) - to store user defined dc store policy rules

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
	CONSTRAINT dc_store_policy_user_rule_pkey PRIMARY KEY (rule_code),
	CONSTRAINT unique_rule_name_rule_type UNIQUE (rule_name, rule_type)
);


--changeset shashwat.yadav:rcl_dc_store_policy_updated stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added is_deletable column
ALTER TABLE inventory_smart.dc_store_policy_user_rule ADD COLUMN IF NOT EXISTS is_deletable bool NOT NULL DEFAULT false;