--liquibase formatted sql
--changeset abhishek.jha@impactanalytics.co:chatbot_attribute_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for chatbot_attribute_master

create sequence if not exists genai.chatbot_attributes_master_attribute_code_seq;

CREATE TABLE if not exists "genai".chatbot_attribute_master (
	attribute_code int4 DEFAULT nextval('genai.chatbot_attributes_master_attribute_code_seq'::regclass) NOT NULL,
	name varchar NULL,
	attribute_type varchar NULL,
	description varchar NULL,
	status bool NULL,
	attribute_value jsonb NULL,
	application_code int4 NULL,
	user_edited bool DEFAULT false NULL,
	module_code int4 NULL,
	CONSTRAINT chatbot_attributes_master_pk PRIMARY KEY (attribute_code),
	CONSTRAINT chatbot_attribute_master_un UNIQUE (name, attribute_type, application_code)
);