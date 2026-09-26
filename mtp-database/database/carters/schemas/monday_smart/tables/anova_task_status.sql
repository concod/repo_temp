--liquibase formatted sql
--changeset altaf.husainkhan@impactanalytics.co:anova_task_status stripComments:false splitStatements:false context:Release_1_0 labels:genai_table_addition
--comment: initial changeset for anova_task_status

CREATE TABLE monday_smart.anova_task_status (
	created_at timestamptz DEFAULT now() NOT NULL,
	task_id varchar(255) NOT NULL,
	task_name varchar(255) NULL,
	url varchar NULL,
	payload varchar NULL,
	status varchar(255) NULL,
	message varchar NULL,
	num_retries int4 DEFAULT 0 NULL,
	CONSTRAINT anova_task_status_task_id_key UNIQUE (task_id)
);