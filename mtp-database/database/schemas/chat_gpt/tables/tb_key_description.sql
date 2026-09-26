--liquibase formatted sql
--changeset bhargav.polavarapu@impactanalytics.co:tb_key_description_create stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: tb_key_description table creation

CREATE TABLE chat_gpt.tb_key_description (
	id serial4 NOT NULL,
	key_word varchar NOT NULL,
	description varchar NULL,
	remarks varchar NULL,
	created_on timestamp NOT NULL DEFAULT now(),
	updated_on timestamp NOT NULL DEFAULT now(),
	created_by int4 NOT NULL DEFAULT '-1'::integer,
	updated_by int4 NOT NULL DEFAULT '-1'::integer,
	CONSTRAINT tb_key_description_pk PRIMARY KEY (key_word),
	CONSTRAINT tb_key_description_un UNIQUE (id)
);