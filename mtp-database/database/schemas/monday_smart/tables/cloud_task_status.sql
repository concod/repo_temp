--liquibase formatted sql
--changeset sivaprasath.vadivel:cloud_task_status_create stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for cloud_task_status

CREATE TABLE monday_smart.cloud_task_status (
	created_at timestamptz DEFAULT now() NOT NULL,
	task_id varchar NOT NULL,
	task_name varchar NULL,
	url varchar NULL,
	payload varchar NULL,
	status varchar NULL,
	message varchar NULL,
	num_retries int4 DEFAULT 0 NULL,
	CONSTRAINT cloud_task_status_task_id_key UNIQUE (task_id)
);