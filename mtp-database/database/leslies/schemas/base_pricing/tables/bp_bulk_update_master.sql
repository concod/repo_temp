--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_bulk_update_master_10 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_bulk_update_master_10

CREATE TABLE base_pricing.bp_bulk_update_master (
	id serial4 NOT NULL,
	total_records int4 NOT NULL,
	entity_type varchar(20) NOT NULL,
	instance_count int4 NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NULL,
	created_by int4 DEFAULT 0 NULL,
	updated_by int4 DEFAULT 0 NULL,
	CONSTRAINT bp_bulk_update_master_pkey PRIMARY KEY (id)
);