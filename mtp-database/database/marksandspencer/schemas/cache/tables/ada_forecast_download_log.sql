--liquibase formatted sql
--changeset mahima.choudhary:ada_forecast_download_log stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for ada_forecast_download_log

CREATE TABLE if not EXISTS "cache".ada_forecast_download_log (
	task_id serial4 NOT NULL,
	user_email_id varchar(50) NOT NULL,
	download_query text NULL,
	status varchar(20) NOT NULL,
	triggered_at timestamp NULL,
	started_at timestamp NULL,
	completed_at timestamp NULL,
	failed_at timestamp NULL,
	failure_reason varchar NULL,
	downloaded_at timestamp NULL,
	row_count int4 NULL,
	CONSTRAINT ada_forecast_download_log_pkey PRIMARY KEY (task_id)
);