--liquibase formatted sql
--changeset arshad.k@impactanalytics.co:chatbot_attribute_master_3 stripComments:false splitStatements:false context:Release_1_3 labels:MTP-73057
--comment: initial changeset for chatbot_attribute_master 

CREATE TABLE IF NOT exists genai.chatbot_attribute_master (
	attribute_code SERIAL NOT NULL,
    "name" varchar NULL,
	attribute_type varchar NULL,
	description varchar NULL,
	status bool NULL,
	attribute_value jsonb NULL,
	application_code int4 NULL,
	user_edited bool DEFAULT false NULL,
	module_code int4 NULL,
	CONSTRAINT chatbot_attribute_master_un UNIQUE (name, attribute_type, application_code),
	CONSTRAINT chatbot_attributes_master_pk PRIMARY KEY (attribute_code)
);