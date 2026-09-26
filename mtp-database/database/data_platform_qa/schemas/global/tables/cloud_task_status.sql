--liquibase formatted sql
--changeset liquibase:cloud_task_status stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for cloud_task_status
CREATE TABLE "global".cloud_task_status (
	created_at timestamptz NOT NULL DEFAULT now(),
	task_id varchar(255) NOT NULL,
	task_name varchar(255) NULL,
	url varchar NULL,
	payload varchar NULL,
	status varchar(255) NULL,
	message varchar NULL,
	CONSTRAINT cloud_task_status_task_id_key UNIQUE (task_id)
);