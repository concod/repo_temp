--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_suffixes_metadata stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_suffixes_metadata

CREATE TABLE base_pricing.bp_suffixes_metadata (
	suffix_id serial4 NOT NULL,
	suffix varchar(50) NOT NULL,
	suffix_display_name varchar(100) NOT NULL,
	is_active bool DEFAULT true NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT bp_suffixes_metadata_pkey PRIMARY KEY (suffix_id),
	CONSTRAINT bp_suffixes_metadata_suffix_key UNIQUE (suffix)
);