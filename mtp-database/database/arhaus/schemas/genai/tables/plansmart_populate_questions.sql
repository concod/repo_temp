--liquibase formatted sql
--changeset arshad.k@impactanalytics.co:plansmart_populate_questions3 stripComments:false splitStatements:false context:Release_1_3 labels:MTP-73057
--comment: initial changeset for plansmart_populate_questions 


CREATE TABLE IF NOT exists genai.plansmart_populate_questions (
	id serial4 NOT NULL,
	status bool DEFAULT true NOT NULL,
	screen_name varchar(255) NOT NULL,
	questions jsonb NOT NULL,
	application_code int4 DEFAULT 1 NOT NULL
);