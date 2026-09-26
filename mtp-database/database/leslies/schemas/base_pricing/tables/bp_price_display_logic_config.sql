--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_price_display_logic_config_10 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_price_display_logic_config_10

CREATE TABLE base_pricing.bp_price_display_logic_config (
	logic_id serial4 NOT NULL,
	segment_code varchar(50) NOT NULL,
	logic_type varchar(50) NOT NULL,
	logic_config jsonb NULL,
	fallback_segment varchar(50) NULL,
	is_active bool DEFAULT true NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	created_by int4 NULL,
	updated_by int4 NULL,
	CONSTRAINT bp_price_display_logic_config_pkey PRIMARY KEY (logic_id),
	CONSTRAINT uk_price_display_logic UNIQUE (segment_code)
);
CREATE INDEX idx_price_display_logic_active ON base_pricing.bp_price_display_logic_config USING btree (is_active);