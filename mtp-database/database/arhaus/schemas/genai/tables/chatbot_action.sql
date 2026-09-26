--liquibase formatted sql
--changeset arshad.k@impactanalytics.co:chatbot_action_3 stripComments:false splitStatements:false context:Release_1_3 labels:MTP-73057
--comment: initial changeset for chatbot_action 

CREATE TABLE IF NOT exists genai.chatbot_action (
	id serial4 NOT NULL,
	liked bool NULL,
	questions text NULL,
	application_code int4 DEFAULT 1 NOT NULL,
	user_id int4 NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT chatbot_action_pk PRIMARY KEY (id)
);