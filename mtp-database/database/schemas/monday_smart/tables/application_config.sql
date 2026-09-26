--liquibase formatted sql
--changeset liquibase:application_config_create stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for application_config
CREATE TABLE monday_smart.application_config (
	id serial4 NOT NULL,
	"name" varchar NULL,
	"data" jsonb NULL,
	CONSTRAINT application_config_name_key UNIQUE (name),
	CONSTRAINT application_config_pkey PRIMARY KEY (id)
);