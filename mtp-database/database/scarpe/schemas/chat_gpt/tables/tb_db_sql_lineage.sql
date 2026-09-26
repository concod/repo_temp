--liquibase formatted sql
--changeset madamanchi.chandravardhan@impactanalytics.co:tb_db_sql_lineage stripComments:false splitStatements:false context:Release_1_0 labels:genai_table_addition
--comment: initial changeset for tb_db_sql_lineage


CREATE TABLE chat_gpt.tb_db_sql_lineage (
	user_id varchar(30) NOT NULL,
	parent_id varchar(80) NOT NULL,
	thread_id varchar(80) NOT NULL,
	original_query text NULL,
	pseudo_query text NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	user_input text NULL,
	CONSTRAINT tb_db_sql_lineage_pkey PRIMARY KEY (user_id, parent_id, thread_id)
);