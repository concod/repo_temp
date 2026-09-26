--liquibase formatted sql
--changeset biplab.malaklar@impactanalytics.co:plansmart_populate_questions_2 stripComments:false splitStatements:false context:Release_1_2 labels:liquibase_project_start
--comment: initial changeset for acl_master

CREATE TABLE genai.plansmart_populate_questions (
	id serial4 NOT NULL,
	status bool NOT NULL DEFAULT true,
	screen_name varchar(255) NOT NULL,
	questions jsonb NOT NULL,
	application_code int4 NOT NULL DEFAULT 1,
	flow_type genai."chatbot_flow" NULL
);

--changeset akshay.jain:flowtype stripComments:false splitStatements:false context:Release_1_2 labels:liquibase_project_start
--comment: added column explicity if not exist in db
ALTER TABLE "genai".plansmart_populate_questions add column if not exists flow_type genai."chatbot_flow" NULL;