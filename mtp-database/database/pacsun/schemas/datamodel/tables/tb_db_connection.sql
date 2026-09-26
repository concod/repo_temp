--liquibase formatted sql
--changeset archa.prakash@impactanalytics.co:tb_db_connection stripComments:false splitStatements:false context:Release_1_0 labels:tb_db_connection1
--comment: initial changeset for tb_db_connection
CREATE TABLE datamodel.tb_db_connection (
	id serial4 NOT NULL,
	db_provider int4 NULL,
	connection_name varchar(100) NOT NULL,
	db_host varchar(200) NOT NULL,
	db_port int4 NULL,
	db_user varchar(100) NOT NULL,
	db_password text NULL,
	db_name varchar(100) NOT NULL,
	CONSTRAINT tb_app_dbconnection_pkey PRIMARY KEY (connection_name),
	CONSTRAINT tb_db_connection_id_key UNIQUE (id)
);
CREATE INDEX fki_fk_db_provider ON datamodel.tb_db_connection USING btree (db_provider);


-- datamodel.tb_db_connection foreign keys
ALTER TABLE datamodel.tb_db_connection ADD CONSTRAINT fk_db_provider FOREIGN KEY (db_provider) REFERENCES datamodel.tb_db_providers(id);