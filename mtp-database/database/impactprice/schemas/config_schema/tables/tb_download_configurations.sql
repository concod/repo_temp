--liquibase formatted sql
--changeset liquibase:tb_download_configurations_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_download_configurations_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_download_configurations_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_download_configurations stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_download_configurations

CREATE TABLE config_schema.tb_download_configurations (
	id integer DEFAULT nextval('config_schema.tb_download_configurations_id_seq'::regclass) NOT NULL,
	section_config_id integer,
	download_code varchar(100) NOT NULL,
	download_name varchar(255) NOT NULL,
	description text,
	file_name_template varchar(255) DEFAULT 'Report_{date}'::character varying,
	export_formats jsonb DEFAULT '["csv", "xlsx"]'::jsonb,
	is_active boolean DEFAULT true,
	created_at timestamp without time zone DEFAULT now(),
	updated_at timestamp without time zone DEFAULT now(),
	created_by varchar(255),
	updated_by varchar(255),
	default_connection_id integer,
	CONSTRAINT tb_download_configurations_pkey PRIMARY KEY (id),
	CONSTRAINT tb_download_configurations_section_config_id_fkey FOREIGN KEY (section_config_id) REFERENCES config_schema.tb_section_configurations(id) ON DELETE SET NULL
);
CREATE INDEX idx_download_config_section ON config_schema.tb_download_configurations USING btree (section_config_id);
CREATE UNIQUE INDEX idx_download_config_code ON config_schema.tb_download_configurations USING btree (download_code);
