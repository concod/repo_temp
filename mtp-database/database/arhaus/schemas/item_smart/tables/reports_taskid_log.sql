--liquibase formatted sql
--changeset liquibase:reports_taskid_log stripComments:false splitStatements:false context:Release_1_0 labels: MTP-54282
--comment: created table reports_taskid_log to keep track of unique task id generated during reports download

CREATE TABLE item_smart.reports_taskid_log (
	task_id varchar(255) NOT NULL,
	current_stage int4 NULL,
	CONSTRAINT reports_taskid_log_pkey PRIMARY KEY (task_id)
);