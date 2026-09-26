--liquibase formatted sql
--changeset biplab.malaklar@impactanalytics.co:chatbot_action_2 stripComments:false splitStatements:false context:Release_1_2 labels:liquibase_project_start
--comment: initial changeset for acl_master

CREATE TABLE genai.chatbot_action (
	id serial4 NOT NULL,
	liked bool default null,
	questions text default null,
	application_code int4 DEFAULT 1 NOT NULL,
	user_id int4 not null,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT null,
	CONSTRAINT chatbot_action_pk PRIMARY KEY (id)
);

--changeset shannonnelson.d@impactanalytics.co:chatbot_action_3 stripComments:false splitStatements:false context:Release_2_0 labels:chatbot_action_3
--comment: added response column
ALTER TABLE genai.chatbot_action
ADD COLUMN IF NOT EXISTS response text default null;