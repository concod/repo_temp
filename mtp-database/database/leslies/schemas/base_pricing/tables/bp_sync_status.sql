--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_sync_status_10 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_sync_status_10

CREATE TABLE base_pricing.bp_sync_status (
	sync_status_id serial4 NOT NULL,
	sync_status_name varchar(50) NOT NULL,
	sync_status_label varchar(50) NOT NULL,
	sync_status_description text NULL,
	is_active bool DEFAULT true NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT bp_sync_status_pkey PRIMARY KEY (sync_status_id),
	CONSTRAINT bp_sync_status_sync_status_name_key UNIQUE (sync_status_name)
);
CREATE INDEX idx_sync_status_id ON base_pricing.bp_sync_status USING btree (sync_status_id);
CREATE INDEX idx_sync_status_name ON base_pricing.bp_sync_status USING btree (sync_status_name);