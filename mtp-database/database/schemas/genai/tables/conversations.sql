--liquibase formatted sql
--changeset biplab.malaklar@impactanalytics.co:conversations stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for acl_master

CREATE TABLE IF NOT exists genai.conversations (
	conversation_id serial4 NOT NULL,
	module_name varchar(255) NOT NULL,
	flow_type genai."chatbot_flow" NULL,
	application_code int4 NOT NULL,
	"name" varchar(255) NOT NULL,
	created_at timestamptz DEFAULT now() NULL,
	updated_at timestamptz DEFAULT now() NULL,
	user_id int4 NOT NULL,
	is_deleted bool DEFAULT false NOT NULL,
	CONSTRAINT conversations_pk PRIMARY KEY (conversation_id),
	CONSTRAINT conversations_user_fk FOREIGN KEY (user_id) REFERENCES "global".user_master(user_code) ON DELETE SET NULL
);