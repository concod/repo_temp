--liquibase formatted sql
--changeset liquibase:tb_fc_composite_plugin_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_fc_composite_plugin_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_fc_composite_plugin_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_fc_composite_plugin stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_fc_composite_plugin

CREATE TABLE config_schema.tb_fc_composite_plugin (
	id integer DEFAULT nextval('config_schema.tb_fc_composite_plugin_id_seq'::regclass) NOT NULL,
	plugin_code varchar(100) NOT NULL,
	plugin_name varchar(200) NOT NULL,
	fe_component varchar(200) NOT NULL,
	be_handler varchar(200) NOT NULL,
	config_schema jsonb NOT NULL,
	data_schema jsonb NOT NULL,
	db_strategy varchar(30) NOT NULL,
	is_active boolean DEFAULT true,
	CONSTRAINT tb_fc_composite_plugin_plugin_code_key UNIQUE (plugin_code),
	CONSTRAINT tb_fc_composite_plugin_pkey PRIMARY KEY (id)
);
