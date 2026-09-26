--liquibase formatted sql
--changeset bhargav.polavarapu@impactanalytics.co:tb_db_connections_create stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: tb_db_connections table creation
CREATE TABLE chat_gpt.tb_db_connections (
	id serial4 NOT NULL,
	"name" varchar(30) NOT NULL,
	connection_string_sec_id varchar(30) NULL,
	project_name varchar(30) NULL,
	provider_id int4 NOT NULL,
	secret_name varchar NULL,
	connection_string varchar NULL,
	created_on timestamp NOT NULL DEFAULT now(),
	updated_on timestamp NOT NULL DEFAULT now(),
	created_by int4 NOT NULL DEFAULT '-1'::integer,
	updated_by int4 NOT NULL DEFAULT '-1'::integer,
	CONSTRAINT tb_db_connections_id_key UNIQUE (id),
	CONSTRAINT tb_db_connections_pkey PRIMARY KEY (name, provider_id),
	CONSTRAINT provider_id_fk FOREIGN KEY (provider_id) REFERENCES chat_gpt.tb_db_provider(id)
);
CREATE INDEX fki_provider_id_fk ON chat_gpt.tb_db_connections USING btree (provider_id);