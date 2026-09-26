--liquibase formatted sql
--changeset madamanchi.chandravardhan@impactanalytics.co:confidence_table stripComments:false splitStatements:false context:Release_1_0 labels:genai_table_addition
--comment: initial changeset for confidence_table

CREATE TABLE chat_gpt.confidence_table (
	created_at timestamptz DEFAULT now() NOT NULL,
	user_id varchar(255) NOT NULL,
	thread_id varchar(255) NULL,
	parent_id varchar NULL,
	original_intent varchar NULL,
	response_type varchar(255) NULL,
	response varchar NULL,
	logprob varchar NULL,
	user_input varchar NULL
);