--liquibase formatted sql
--changeset liquibase:store_transfer_config_updated_2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_transfer_config_updated_2

CREATE TABLE IF NOT EXISTS inventory_smart.store_transfer_config (
	config_id serial4 NOT NULL,
	article varchar NOT NULL,
	optimisation_level varchar NOT NULL,
	transfer_strategy varchar NOT NULL,
	transfer_rule_id int4 NULL,
	config_params jsonb DEFAULT '{}'::jsonb NOT NULL,
	is_enabled bool DEFAULT true NULL,
	CONSTRAINT store_transfer_config_article_unique UNIQUE (article),
	CONSTRAINT store_transfer_config_pkey PRIMARY KEY (config_id),
	CONSTRAINT transfer_rule_id_updated_by_fk FOREIGN KEY (transfer_rule_id) REFERENCES inventory_smart.store_transfer_rule(rule_id)
);