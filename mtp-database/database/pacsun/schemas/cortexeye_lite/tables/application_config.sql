--liquibase formatted sql
--changeset pranavkumar.singh@impactanalytics.co:application_config stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for application_config

CREATE TABLE cortexeye_lite.application_config (
	id serial4 NOT NULL,
	"name" varchar NULL,
	"data" jsonb NULL,
	CONSTRAINT application_config_pkey PRIMARY KEY (id)
);