
--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_price_change_reason_v2 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_price_change_reason_v2

CREATE TABLE base_pricing.bp_price_change_reason (
	strategy_id int4 NOT NULL,
	opt_level_bins varchar NOT NULL,
	price_change_data jsonb NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT bp_price_change_reason_pkey PRIMARY KEY (strategy_id, opt_level_bins),
	CONSTRAINT bp_price_change_reason_strategy_fk FOREIGN KEY (strategy_id) REFERENCES base_pricing.bp_strategy_master(strategy_id) ON DELETE CASCADE
);