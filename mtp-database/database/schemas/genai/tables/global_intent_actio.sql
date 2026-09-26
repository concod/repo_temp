--liquibase formatted sql
--changeset biplab.malaklar@impactanalytics.co:global_intent_action stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for acl_master

CREATE TABLE IF NOT exists genai.global_intent_action (
	id serial4 NOT NULL,
	name varchar NOT NULL,
	attribute_value jsonb NULL,
	application_code int4 NULL DEFAULT 3,
	prompt varchar NULL,
	status bool NULL DEFAULT true,
	CONSTRAINT attributes_master_pk PRIMARY KEY (name)
);