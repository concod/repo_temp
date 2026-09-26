--liquibase formatted sql
--changeset liquibase:tb_default_configurations_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_default_configurations_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_default_configurations_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_default_configurations stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_default_configurations

CREATE TABLE config_schema.tb_default_configurations (
	id integer DEFAULT nextval('config_schema.tb_default_configurations_id_seq'::regclass) NOT NULL,
	screen_code varchar(100) NOT NULL,
	default_config jsonb NOT NULL,
	schema_version varchar(20) NOT NULL,
	checksum varchar(64),
	created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
	updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT tb_default_configurations_screen_code_key UNIQUE (screen_code),
	CONSTRAINT tb_default_configurations_pkey PRIMARY KEY (id)
);
