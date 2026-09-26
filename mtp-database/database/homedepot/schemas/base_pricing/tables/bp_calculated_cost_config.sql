--liquibase formatted sql
--changeset krithika.s@impactanalytics.co:bp_calculated_cost_config_v1 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_calculated_cost_config_v1

CREATE TABLE base_pricing.bp_calculated_cost_config (
	calculated_id serial4 NOT NULL,
	calculated_code varchar(50) NOT NULL,
	calculated_name varchar(100) NOT NULL,
	display_name varchar(100) NOT NULL,
	formula jsonb NOT NULL,
	depends_on jsonb NULL,
	is_editable bool DEFAULT false NULL,
	is_active bool DEFAULT true NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	created_by int4 NULL,
	updated_by int4 NULL,
	CONSTRAINT bp_calculated_cost_config_pkey PRIMARY KEY (calculated_id),
	CONSTRAINT uk_calculated_cost_config UNIQUE (calculated_code)
);
CREATE INDEX idx_calculated_cost_config_active ON base_pricing.bp_calculated_cost_config USING btree (is_active);