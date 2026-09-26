--liquibase formatted sql
--changeset bhargav.polavarapu@impactanalytics.co:tb_db_provider_create stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: tb_db_provider table creation
CREATE TABLE chat_gpt.tb_db_provider (
	id serial4 NOT NULL,
	"name" varchar(30) NOT NULL,
	created_on timestamp NOT NULL DEFAULT now(),
	updated_on timestamp NOT NULL DEFAULT now(),
	created_by int4 NOT NULL DEFAULT '-1'::integer,
	updated_by int4 NOT NULL DEFAULT '-1'::integer,
	CONSTRAINT tb_db_provider_id_key UNIQUE (id),
	CONSTRAINT tb_db_provider_pkey PRIMARY KEY (name)
);