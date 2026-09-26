--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_strategy_rules_mapping_v2 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_strategy_rules_mapping_v2

CREATE TABLE base_pricing.bp_strategy_rules_mapping (
	strategy_id int4 NOT NULL,
	rule_id int4 NOT NULL,
	is_sync_enabled bool NULL,
	priority int4 NULL,
	products_affected_count int4 DEFAULT 0 NULL,
	stores_affected_count int4 DEFAULT 0 NULL,
	segments_affected_count int4 DEFAULT 0 NULL,
	products_affected_percentage numeric(5, 2) DEFAULT 0.00 NULL,
	stores_affected_percentage numeric(5, 2) DEFAULT 0.00 NULL,
	segments_affected_percentage numeric(5, 2) DEFAULT 0.00 NULL,
	rule_flexibility varchar(20) NULL,
	is_added_to_strategy bool NULL,
	is_active bool DEFAULT true NULL,
	created_by int4 NOT NULL,
	created_at timestamp NOT NULL,
	updated_by int4 NOT NULL,
	updated_at timestamp NOT NULL,
	CONSTRAINT bp_strategy_rules_pkey PRIMARY KEY (strategy_id, rule_id),
	CONSTRAINT bp_strategy_rules_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES base_pricing.bp_rule_master(id) ON DELETE CASCADE
)
PARTITION BY LIST (strategy_id);
CREATE INDEX idx_bp_strategy_rules_mapping ON  base_pricing.bp_strategy_rules_mapping USING btree (strategy_id, rule_id, priority);
CREATE INDEX idx_bp_strategy_rules_mapping_rule_id ON  base_pricing.bp_strategy_rules_mapping USING btree (rule_id);