--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_refresh_entity_history_10 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_refresh_entity_history_10

CREATE TABLE base_pricing.bp_refresh_entity_history (
	history_id serial4 NOT NULL,
	task_id int4 NOT NULL,
	entity_type varchar(50) NOT NULL,
	entity_id int4 NOT NULL,
	entity_name varchar(255) NOT NULL,
	status varchar(20) NOT NULL,
	start_time timestamp NOT NULL,
	end_time timestamp NULL,
	error_message text NULL,
	refresh_reasons _text NOT NULL,
	metrics jsonb NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	updated_at timestamp DEFAULT now() NOT NULL,
	CONSTRAINT bp_refresh_entity_history_pkey PRIMARY KEY (history_id),
	CONSTRAINT bp_refresh_entity_history_task_id_fkey FOREIGN KEY (task_id) REFERENCES base_pricing.bp_refresh_task_history(task_id)
);
CREATE INDEX idx_refresh_entity_history_status ON base_pricing.bp_refresh_entity_history USING btree (status);
CREATE INDEX idx_refresh_entity_history_task_id ON base_pricing.bp_refresh_entity_history USING btree (task_id);