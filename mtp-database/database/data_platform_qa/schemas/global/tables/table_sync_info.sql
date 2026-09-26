--liquibase formatted sql
--changeset arnab.nandy@impactanalytics.co:gcs_sync_info stripComments:false splitStatements:false context:MTP-22867 labels:liquibase_project_start
--comment: creating table table_sync_info

CREATE TABLE "global".table_sync_info (
	schema_name varchar NOT NULL,
	table_name varchar NOT NULL,
	description text NULL,
	last_successful_sync_time timestamptz NOT NULL,
	CONSTRAINT table_sync_info_un UNIQUE (schema_name, table_name)
);