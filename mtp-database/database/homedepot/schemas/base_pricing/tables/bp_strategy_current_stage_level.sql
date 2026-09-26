
--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_strategy_current_stage_level_v2 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_strategy_current_stage_level_v2

CREATE TABLE base_pricing.bp_strategy_current_stage_level (
	current_stage_id int2 NOT NULL,
	current_stage_value varchar(255) NOT NULL,
	current_stage_display_name varchar(255) NOT NULL,
	current_stage_description text NULL,
	is_active bool DEFAULT true NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT bp_strategy_current_stage_pkey PRIMARY KEY (current_stage_id)
);