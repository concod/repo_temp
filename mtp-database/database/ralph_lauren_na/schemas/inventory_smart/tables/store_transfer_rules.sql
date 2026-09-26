--liquibase formatted sql
--changeset aniket.ashis@impactanalytics.co:store_to_store_rule_transfers stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset  for inventory_smart.store_transfer_rules

CREATE TABLE inventory_smart.store_transfer_rules (
	rule_id serial4 NOT NULL,
	rule_name varchar NOT NULL,
	channel varchar NULL,
	transfer_within varchar NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	created_by int4 NULL,
	updated_at timestamptz NULL,
	is_deleted bool DEFAULT false NULL,
	is_default bool DEFAULT true NULL,
	updated_by int4 NULL,
	store_groups varchar NULL,
	CONSTRAINT store_transfer_rules_pkey PRIMARY KEY (rule_id)
);


