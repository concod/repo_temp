--liquibase formatted sql
--changeset rishabh.swarnkar@impactanalytics.co:lf_master stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: initial changeset for lf_master

CREATE TABLE item_smart.reports_taskid_log (
	task_id varchar(255) NOT NULL,
	current_stage int4 NULL,
	CONSTRAINT reports_taskid_log_pkey PRIMARY KEY (task_id)
);