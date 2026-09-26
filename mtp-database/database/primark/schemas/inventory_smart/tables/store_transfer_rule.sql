--liquibase formatted sql
--changeset liquibase:store_transfer_rule_updated_2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_transfer_rule_updated_2

CREATE TABLE IF NOT EXISTS inventory_smart.store_transfer_rule (
	rule_id int4 NOT NULL,
	rule_name varchar NOT NULL,
	channel varchar NULL,
	transfer_within varchar NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	created_by varchar NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	is_deleted bool DEFAULT false NULL,
	is_default bool DEFAULT true NULL,
	CONSTRAINT store_transfer_rule_pkey PRIMARY KEY (rule_id)
);