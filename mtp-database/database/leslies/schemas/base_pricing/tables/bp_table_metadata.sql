--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_table_metadata_10 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_table_metadata_10


CREATE TABLE base_pricing.bp_table_metadata (
	table_id int2 NOT NULL,
	table_code varchar(50) NOT NULL,
	table_name varchar(255) NOT NULL,
	is_active bool DEFAULT true NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	is_select_all bool DEFAULT false NULL,
	is_single_select bool DEFAULT true NULL,
	is_multi_select bool DEFAULT false NULL,
	child jsonb DEFAULT '[]'::jsonb NULL,
	conditional_behaviors jsonb DEFAULT '{}'::jsonb NULL,
	CONSTRAINT bp_screen_metadata_pkey PRIMARY KEY (table_id),
	CONSTRAINT bp_screen_metadata_screen_code_key UNIQUE (table_code)
);