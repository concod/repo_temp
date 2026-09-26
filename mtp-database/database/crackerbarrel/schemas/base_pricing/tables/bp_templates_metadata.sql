--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_templates_metadata stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_templates_metadata

CREATE TABLE base_pricing.bp_templates_metadata (
	template_id int2 NOT NULL,
	template_name varchar(255) NOT NULL,
	description text NULL,
	is_active bool DEFAULT true NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	primary_key_columns jsonb DEFAULT '[]'::jsonb NOT NULL,
	CONSTRAINT bp_templates_metadata_pkey PRIMARY KEY (template_id),
	CONSTRAINT bp_templates_metadata_template_name_key UNIQUE (template_name)
);