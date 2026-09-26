--liquibase formatted sql
--changeset liquibase:rcl_dc_store_policy stripComments:false splitStatements:false context:MTP-63019 labels:MTP-63019
--comment: MTP-63019 DC Store Policy Rule table (auto allocation rules, dc store rules) - to store dc store policy rules which are pre-defiend.

CREATE TABLE IF NOT EXISTS inventory_smart.dc_store_policy_rule (
	rule_name varchar(255) NOT NULL,
	rule_structure json NOT NULL,
	default_value json NULL,
	rule_type varchar(255) NOT NULL,
	is_mandatory bool NOT NULL,
	rule_key varchar NOT NULL,
	CONSTRAINT dc_store_policy_rule_pkey PRIMARY KEY (rule_key)
);