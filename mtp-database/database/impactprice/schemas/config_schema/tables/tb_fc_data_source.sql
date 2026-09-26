--liquibase formatted sql
--changeset liquibase:tb_fc_data_source_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_fc_data_source_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_fc_data_source_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_fc_data_source stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_fc_data_source

CREATE TABLE config_schema.tb_fc_data_source (
	id integer DEFAULT nextval('config_schema.tb_fc_data_source_id_seq'::regclass) NOT NULL,
	source_code varchar(100) NOT NULL,
	source_type varchar(30) NOT NULL,
	source_config jsonb NOT NULL,
	cache_ttl_sec integer DEFAULT 300,
	is_active boolean DEFAULT true,
	CONSTRAINT tb_fc_data_source_source_code_key UNIQUE (source_code),
	CONSTRAINT tb_fc_data_source_pkey PRIMARY KEY (id)
);
