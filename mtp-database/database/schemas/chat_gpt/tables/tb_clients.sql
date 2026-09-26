--liquibase formatted sql
--changeset bhargav.polavarapu@impactanalytics.co:tb_chat_clients_create stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: tb_chat_clients table creation
CREATE TABLE chat_gpt.tb_clients (
	id bigserial NOT NULL,
	client_name text NOT NULL,
	created_by int4 NULL,
	is_active bool NULL DEFAULT true,
	created_on timestamp NOT NULL DEFAULT now(),
	updated_on timestamp NOT NULL DEFAULT now(),
	updated_by int4 NOT NULL DEFAULT '-1'::integer,
	CONSTRAINT tb_clients_id_key UNIQUE (id),
	CONSTRAINT tb_clients_pkey PRIMARY KEY (client_name)
);