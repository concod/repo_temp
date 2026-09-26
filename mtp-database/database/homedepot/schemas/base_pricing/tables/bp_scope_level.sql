
--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_scope_level_v2 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_scope_level_v2

CREATE TABLE base_pricing.bp_scope_level (
	scope_level_id int2 NOT NULL,
	scope_level_value varchar(255) NOT NULL,
	scope_level_display_name varchar(255) NOT NULL,
	scope_level_description text NULL,
	is_active bool DEFAULT true NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT bp_scope_level_pkey PRIMARY KEY (scope_level_id)
);