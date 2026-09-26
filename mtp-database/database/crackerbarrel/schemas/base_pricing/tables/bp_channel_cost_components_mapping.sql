--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_channel_cost_components_mapping stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_channel_cost_components_mapping

CREATE TABLE base_pricing.bp_channel_cost_components_mapping (
	mapping_id serial4 NOT NULL,
	channel_code varchar(50) NOT NULL,
	component_code varchar(50) NOT NULL,
	operation varchar(10) NOT NULL,
	sort_order int4 DEFAULT 0 NULL,
	is_active bool DEFAULT true NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT bp_channel_cost_components_mapping_pkey PRIMARY KEY (mapping_id),
	CONSTRAINT uk_channel_cost_mapping UNIQUE (channel_code, component_code),
	CONSTRAINT fk_channel_cost_mapping_channel FOREIGN KEY (channel_code) REFERENCES base_pricing.bp_channel_cost_logic_config(channel_code),
	CONSTRAINT fk_channel_cost_mapping_component FOREIGN KEY (component_code) REFERENCES base_pricing.bp_cost_components_config(component_code)
);

CREATE INDEX idx_channel_cost_mapping_active ON base_pricing.bp_channel_cost_components_mapping USING btree (is_active);