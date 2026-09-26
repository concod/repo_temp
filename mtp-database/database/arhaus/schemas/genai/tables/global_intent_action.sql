--liquibase formatted sql
--changeset arshad.k@impactanalytics.co:global_intent_action_3  stripComments:false splitStatements:false context:Release_1_3 labels:MTP-73057
--comment: initial changeset for global_intent_action 



CREATE TABLE IF NOT exists genai.global_intent_action (
	id serial4 NOT NULL,
	"name" varchar NOT NULL,
	attribute_value jsonb NULL,
	application_code int4 DEFAULT 3 NULL,
	prompt varchar NULL,
	status bool DEFAULT true NULL,
	CONSTRAINT attributes_master_pk PRIMARY KEY (name)
);