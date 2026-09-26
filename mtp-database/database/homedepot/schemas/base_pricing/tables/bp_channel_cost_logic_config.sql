--liquibase formatted sql
--changeset krithika.s@impactanalytics.co:bp_channel_cost_logic_config_v1 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_channel_cost_logic_config_v1

CREATE TABLE base_pricing.bp_channel_cost_logic_config (
	logic_id serial4 NOT NULL,
	channel_code varchar(50) NOT NULL,
	channel_name varchar(100) NOT NULL,
	cost_formula jsonb NOT NULL,
	formula_description text NULL,
	is_active bool DEFAULT true NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	created_by int4 NULL,
	updated_by int4 NULL,
	CONSTRAINT bp_channel_cost_logic_config_pkey PRIMARY KEY (logic_id),
	CONSTRAINT uk_channel_cost_logic UNIQUE (channel_code)
);
CREATE INDEX idx_channel_cost_logic_active ON base_pricing.bp_channel_cost_logic_config USING btree (is_active);