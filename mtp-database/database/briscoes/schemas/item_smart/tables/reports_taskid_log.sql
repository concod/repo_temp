
--liquibase formatted sql
--changeset shrey.jaiswal@impactanalytics.co:reports_taskid_log_1 stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: initial changeset for reports_taskid_log_1
CREATE TABLE IF NOT EXISTS item_smart.reports_taskid_log (
	task_id varchar(255) NOT NULL,
	current_stage int4 NULL,
	CONSTRAINT reports_taskid_log_pkey PRIMARY KEY (task_id)
);