--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_refresh_task_history_10 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_refresh_task_history_10

CREATE TABLE base_pricing.bp_refresh_task_history (
	task_id serial4 NOT NULL,
	task_type varchar(50) NOT NULL,
	start_time timestamp NOT NULL,
	end_time timestamp NULL,
	status varchar(20) NOT NULL,
	total_entities int4 DEFAULT 0 NOT NULL,
	successful_entities int4 DEFAULT 0 NOT NULL,
	failed_entities int4 DEFAULT 0 NOT NULL,
	error_message text NULL,
	created_by int4 NOT NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	updated_at timestamp DEFAULT now() NOT NULL,
	CONSTRAINT bp_refresh_task_history_pkey PRIMARY KEY (task_id)
);
CREATE INDEX idx_refresh_task_history_start_time ON base_pricing.bp_refresh_task_history USING btree (start_time);
CREATE INDEX idx_refresh_task_history_status ON base_pricing.bp_refresh_task_history USING btree (status);
CREATE INDEX idx_refresh_task_history_task_type ON base_pricing.bp_refresh_task_history USING btree (task_type);