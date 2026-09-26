--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_actions_10 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_actions_10


CREATE TABLE base_pricing.bp_actions (
	action_id serial4 NOT NULL,
	action_name varchar(50) NOT NULL,
	action_label varchar(50) NOT NULL,
	visible_on_screen _varchar NULL,
	action_description text NULL,
	is_active bool DEFAULT true NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT bp_actions_action_name_key UNIQUE (action_name),
	CONSTRAINT bp_actions_pkey PRIMARY KEY (action_id)
);
CREATE INDEX idx_action_id ON base_pricing.bp_actions USING btree (action_id);
CREATE INDEX idx_action_name ON base_pricing.bp_actions USING btree (action_name);