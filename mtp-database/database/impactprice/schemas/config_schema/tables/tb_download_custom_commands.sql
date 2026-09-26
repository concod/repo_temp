--liquibase formatted sql
--changeset liquibase:tb_download_custom_commands_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_download_custom_commands_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_download_custom_commands_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_download_custom_commands stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_download_custom_commands

CREATE TABLE config_schema.tb_download_custom_commands (
	id integer DEFAULT nextval('config_schema.tb_download_custom_commands_id_seq'::regclass) NOT NULL,
	download_config_id integer NOT NULL,
	command_name varchar(100) NOT NULL,
	command_code varchar(100) NOT NULL,
	description text,
	sql_template text NOT NULL,
	depends_on jsonb DEFAULT '[]'::jsonb,
	placeholder_schema jsonb DEFAULT '[]'::jsonb,
	is_materialized boolean DEFAULT false,
	display_order integer DEFAULT 0,
	is_active boolean DEFAULT true,
	created_at timestamp without time zone DEFAULT now(),
	updated_at timestamp without time zone DEFAULT now(),
	CONSTRAINT uq_custom_command_code_per_config UNIQUE (download_config_id, command_code),
	CONSTRAINT uq_custom_command_name_per_config UNIQUE (download_config_id, command_name),
	CONSTRAINT tb_download_custom_commands_pkey PRIMARY KEY (id),
	CONSTRAINT tb_download_custom_commands_download_config_id_fkey FOREIGN KEY (download_config_id) REFERENCES config_schema.tb_download_configurations(id) ON DELETE CASCADE
);
CREATE INDEX idx_download_custom_commands_config ON config_schema.tb_download_custom_commands USING btree (download_config_id);
