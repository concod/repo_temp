--liquibase formatted sql
--changeset manoj.solanki@impactanalytics.co:etl_pipelines_details stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changes

CREATE TABLE IF NOT EXISTS data_platform.cloud_scheduler_status (
	task_name varchar(255) NOT NULL,
	url varchar NULL,
	payload varchar NULL,
	status varchar(255) NULL,
	message varchar NULL,
	schedule varchar NULL,
	created_by int4 NOT NULL,
	created_at timestamptz NOT NULL,
	updated_by int4 NULL,
	updated_at timestamptz NULL,
	deleted_by int4 NULL,
	deleted_at timestamptz NULL,
	is_deleted bool NOT NULL DEFAULT false,
	CONSTRAINT cloud_scheduler_status_task_id_key PRIMARY KEY (task_name)
);