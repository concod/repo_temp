--liquibase formatted sql
--changeset biplab.malaklar@impactanalytics.co:ada_populate_questions stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for acl_master

CREATE TABLE IF NOT exists genai.ada_populate_questions (
	id serial4 NOT NULL,
	status bool NOT NULL DEFAULT true,
	screen_name varchar(255) NOT NULL,
	questions jsonb NOT NULL,
	application_code int4 NOT NULL DEFAULT 1,
	flow_type genai."chatbot_flow" NULL
);