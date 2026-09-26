--liquibase formatted sql
--changeset bhargav.polavarapu@impactanalytics.co:tb_chat_questions_create stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: tb_chat_questions table creation
CREATE TABLE chat_gpt.tb_chat_questions (
	id bigserial NOT NULL,
	question text NULL,
	generated_query text NULL,
	data_available int2 NULL,
	approved bool NULL,
	product varchar(20) NULL,
	client varchar(20) NULL,
	environment varchar(20) NULL,
	user_id int4 NULL,
	gpt_explanation text NULL,
	prompt_id int8 NOT NULL DEFAULT 0,
	created_on timestamp NOT NULL DEFAULT now(),
	embedding public.vector NULL
);

--changeset bhargav.polavarapu@impactanalytics.co:tb_chat_questions_columns_added_new1 stripComments:false splitStatements:false context:Release_2 labels:new_columns_type_fordesc_addition
--comment: adding new column additional columns added  question_identifier,response_source,is_active,response and formulae description
ALTER TABLE chat_gpt.tb_chat_questions
ADD COLUMN question_identifier varchar  NULL ,
ADD COLUMN response_source varchar  NULL ,
ADD COLUMN is_active boolean NOT NULL DEFAULT True ,
ADD COLUMN response json  NULL ;
