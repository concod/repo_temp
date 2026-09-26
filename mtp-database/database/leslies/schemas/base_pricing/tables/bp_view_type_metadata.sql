--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_view_type_metadata_10 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_view_type_metadata_10


CREATE TABLE base_pricing.bp_view_type_metadata (
	view_type_id int2 NOT NULL,
	view_type_code varchar(50) NOT NULL,
	view_type_name varchar(255) NOT NULL,
	is_active bool DEFAULT true NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT bp_view_type_metadata_pkey PRIMARY KEY (view_type_id),
	CONSTRAINT bp_view_type_metadata_view_type_code_key UNIQUE (view_type_code)
);