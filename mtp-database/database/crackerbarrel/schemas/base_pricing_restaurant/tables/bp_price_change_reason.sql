--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_price_change_reason stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_price_change_reason

CREATE TABLE base_pricing_restaurant.bp_price_change_reason (
	strategy_id int4 NOT NULL,
	opt_level_bins varchar NOT NULL,
	price_change_data jsonb NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT bp_price_change_reason_pkey PRIMARY KEY (strategy_id, opt_level_bins),
	CONSTRAINT bp_price_change_reason_strategy_fk FOREIGN KEY (strategy_id) REFERENCES base_pricing_restaurant.bp_strategy_master(strategy_id) ON DELETE CASCADE
);


--changeset abhishek.singh@impactanalytics.co:bp_price_change_reason_1 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_price_change_reason_1

ALTER TABLE base_pricing_restaurant.bp_price_change_reason 
ADD COLUMN price_change_preserved jsonb NULL;

ALTER TABLE base_pricing_restaurant.bp_price_change_reason
ADD COLUMN IF NOT EXISTS rule_types_applied text[] NULL;

ALTER TABLE base_pricing_restaurant.bp_price_change_reason
ADD COLUMN IF NOT EXISTS rules_exceptions_finalized text[] NULL;

ALTER TABLE base_pricing_restaurant.bp_price_change_reason 
ADD COLUMN IF NOT EXISTS is_rules_refresh BOOLEAN DEFAULT false;


--changeset abhishek.singh@impactanalytics.co:bp_price_change_reason_2 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_price_change_reason_1

ALTER TABLE base_pricing_restaurant.bp_price_change_reason
DROP COLUMN IF EXISTS rules_exceptions_finalized;

ALTER TABLE base_pricing_restaurant.bp_price_change_reason
ADD COLUMN IF NOT EXISTS rule_exceptions_finalized _text NULL;