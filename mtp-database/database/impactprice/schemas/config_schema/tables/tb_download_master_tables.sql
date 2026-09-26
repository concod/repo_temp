--liquibase formatted sql
--changeset liquibase:tb_download_master_tables_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_download_master_tables_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_download_master_tables_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_download_master_tables stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_download_master_tables

CREATE TABLE config_schema.tb_download_master_tables (
	id integer DEFAULT nextval('config_schema.tb_download_master_tables_id_seq'::regclass) NOT NULL,
	category_id integer NOT NULL,
	table_name varchar(255) NOT NULL,
	table_alias varchar(100),
	schema_name varchar(100) DEFAULT 'public'::character varying,
	is_active boolean DEFAULT true,
	display_order integer DEFAULT 0,
	created_at timestamp without time zone DEFAULT now(),
	updated_at timestamp without time zone DEFAULT now(),
	connection_id integer,
	custom_command_id integer,
	CONSTRAINT tb_download_master_tables_pkey PRIMARY KEY (id),
	CONSTRAINT tb_download_master_tables_category_id_fkey FOREIGN KEY (category_id) REFERENCES config_schema.tb_download_categories(id) ON DELETE CASCADE,
	CONSTRAINT tb_download_master_tables_custom_command_id_fkey FOREIGN KEY (custom_command_id) REFERENCES config_schema.tb_download_custom_commands(id) ON DELETE SET NULL
);
CREATE INDEX idx_download_master_tables_category ON config_schema.tb_download_master_tables USING btree (category_id);
