--liquibase formatted sql
--changeset liquibase:tb_download_column_groups_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_download_column_groups_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_download_column_groups_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_download_column_groups stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_download_column_groups

CREATE TABLE config_schema.tb_download_column_groups (
	id integer DEFAULT nextval('config_schema.tb_download_column_groups_id_seq'::regclass) NOT NULL,
	download_config_id integer NOT NULL,
	group_code varchar(100) NOT NULL,
	group_name varchar(255) NOT NULL,
	group_color varchar(20) DEFAULT '#1976d2'::character varying,
	display_order integer DEFAULT 0,
	is_default_selected boolean DEFAULT false,
	is_active boolean DEFAULT true,
	created_at timestamp without time zone DEFAULT now(),
	updated_at timestamp without time zone DEFAULT now(),
	CONSTRAINT tb_download_column_groups_pkey PRIMARY KEY (id),
	CONSTRAINT tb_download_column_groups_download_config_id_fkey FOREIGN KEY (download_config_id) REFERENCES config_schema.tb_download_configurations(id) ON DELETE CASCADE
);
CREATE INDEX idx_download_column_groups_config ON config_schema.tb_download_column_groups USING btree (download_config_id);
CREATE UNIQUE INDEX idx_download_column_groups_code ON config_schema.tb_download_column_groups USING btree (download_config_id, group_code);
