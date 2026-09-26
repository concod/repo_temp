--liquibase formatted sql
--changeset liquibase:tb_download_group_columns_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_download_group_columns_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_download_group_columns_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_download_group_columns stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_download_group_columns

CREATE TABLE config_schema.tb_download_group_columns (
	id integer DEFAULT nextval('config_schema.tb_download_group_columns_id_seq'::regclass) NOT NULL,
	group_id integer NOT NULL,
	data_column_id integer NOT NULL,
	display_order integer DEFAULT 0,
	created_at timestamp without time zone DEFAULT now(),
	updated_at timestamp without time zone DEFAULT now(),
	CONSTRAINT tb_download_group_columns_pkey PRIMARY KEY (id),
	CONSTRAINT tb_download_group_columns_data_column_id_fkey FOREIGN KEY (data_column_id) REFERENCES config_schema.tb_download_data_columns(id) ON DELETE CASCADE,
	CONSTRAINT tb_download_group_columns_group_id_fkey FOREIGN KEY (group_id) REFERENCES config_schema.tb_download_column_groups(id) ON DELETE CASCADE
);
CREATE INDEX idx_download_group_columns_group ON config_schema.tb_download_group_columns USING btree (group_id);
CREATE INDEX idx_download_group_columns_col ON config_schema.tb_download_group_columns USING btree (data_column_id);
CREATE UNIQUE INDEX idx_download_group_columns_unique ON config_schema.tb_download_group_columns USING btree (group_id, data_column_id);
