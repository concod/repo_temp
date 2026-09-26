--liquibase formatted sql
--changeset biplab.malaklar@impactanalytics.co:tb_populate_questions stripComments:false splitStatements:false context:Release_2_1 labels:liquibase_project_start
--comment: tb_populate_questions table creation
drop type if exists chat_gpt."chatbot_flow" cascade;
create type chat_gpt."chatbot_flow" as enum('NAVIGATION', 'INSIGHTS');

CREATE TABLE IF NOT EXISTS chat_gpt."tb_populate_questions" (
	id serial4 NOT NULL,
	flow_type chat_gpt.chatbot_flow NOT NULL,
	status bool NOT NULL DEFAULT true,
	screen_name varchar(255) NOT NULL,
	questions jsonb NOT NULL
);

--changeset biplab.malaklar@impactanalytics.co:tb_populate_questions_changes_update_fix stripComments:false splitStatements:false context:Release_2_2 labels:liquibase_project_start
--comment: tb_populate_questions table add application_code and constraint
alter table chat_gpt.tb_populate_questions 
add column application_code int4 not null default 1;

alter table chat_gpt.tb_populate_questions 
add constraint tb_populate_questions_pk primary key(screen_name, flow_type, application_code);
