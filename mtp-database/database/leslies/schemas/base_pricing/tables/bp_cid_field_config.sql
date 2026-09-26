--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_cid_field_config_10 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_cid_field_config_10


CREATE TABLE base_pricing.bp_cid_field_config (
	id serial4 NOT NULL,
	cid_fields varchar NOT NULL,
	is_active bool DEFAULT true NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	created_by varchar(100) NULL,
	updated_by varchar(100) NULL,
	CONSTRAINT bp_cid_field_config_pkey PRIMARY KEY (id)
);