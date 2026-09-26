--liquibase formatted sql
--changeset yashraj.jha@impactanalytics.co:bp_notifier_config stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_notifier_config

CREATE TABLE base_pricing_restaurant.bp_notifier_config (
	id serial4 NOT NULL,
	category varchar(100) DEFAULT 'global'::character varying NOT NULL,
	process_key varchar(100) NOT NULL,
	channel_key varchar(50) NOT NULL,
	setting_key varchar(100) NOT NULL,
	setting_value text NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT bp_notifier_config_pkey PRIMARY KEY (id),
	CONSTRAINT bp_notifier_config_process_key_channel_key_setting_key_key UNIQUE (process_key, channel_key, setting_key)
);