--liquibase formatted sql
--changeset krithika.s@impactanalytics.co:bp_cost_components_config_v1 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_cost_components_config_v1

CREATE TABLE base_pricing.bp_cost_components_config (
	component_id serial4 NOT NULL,
	component_code varchar(50) NOT NULL,
	component_name varchar(100) NOT NULL,
	display_name varchar(100) NOT NULL,
	data_type varchar(20) DEFAULT 'float'::character varying NULL,
	is_editable bool DEFAULT true NULL,
	is_required bool DEFAULT false NULL,
	default_value numeric(10, 2) DEFAULT 0.00 NULL,
	validation_rules jsonb NULL,
	sort_order int4 DEFAULT 0 NULL,
	is_active bool DEFAULT true NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	created_by int4 NULL,
	updated_by int4 NULL,
	CONSTRAINT bp_cost_components_config_pkey PRIMARY KEY (component_id),
	CONSTRAINT uk_cost_components_config UNIQUE (component_code)
);
CREATE INDEX idx_cost_components_config_active ON base_pricing.bp_cost_components_config USING btree (is_active);