--liquibase formatted sql
--changeset sivaprasath.vadivel@impactanalytics.co:confidence_table_2_create stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: confidence_table_2 table creation

CREATE TABLE chat_gpt.confidence_table_2 (
	created_at timestamptz DEFAULT now() NOT NULL,
	user_id varchar(255) NOT NULL,
	thread_id varchar(255) NULL,
	parent_id varchar NULL,
	original_intent varchar NULL,
	response_type varchar(255) NULL,
	response varchar NULL,
	logprob varchar NULL,
	user_input varchar NULL,
	test2sql_mode_query varchar NULL,
	insight_mode_query varchar NULL,
	llm_mapper_response varchar NULL,
	combined_questions varchar NULL
);