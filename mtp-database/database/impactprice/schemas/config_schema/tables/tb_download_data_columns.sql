--liquibase formatted sql
--changeset liquibase:tb_download_data_columns_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_download_data_columns_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_download_data_columns_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_download_data_columns stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_download_data_columns

CREATE TABLE config_schema.tb_download_data_columns (
	id integer DEFAULT nextval('config_schema.tb_download_data_columns_id_seq'::regclass) NOT NULL,
	data_table_id integer NOT NULL,
	column_name varchar(255) NOT NULL,
	column_label varchar(255) NOT NULL,
	aggregation varchar(20) DEFAULT 'SUM'::character varying,
	custom_aggregation_sql text,
	data_format jsonb DEFAULT '{}'::jsonb,
	conditional_formatting jsonb DEFAULT '[]'::jsonb,
	display_order integer DEFAULT 0,
	is_active boolean DEFAULT true,
	is_included_by_default boolean DEFAULT true,
	created_at timestamp without time zone DEFAULT now(),
	updated_at timestamp without time zone DEFAULT now(),
	output_position integer,
	CONSTRAINT tb_download_data_columns_pkey PRIMARY KEY (id),
	CONSTRAINT tb_download_data_columns_data_table_id_fkey FOREIGN KEY (data_table_id) REFERENCES config_schema.tb_download_data_tables(id) ON DELETE CASCADE
);
CREATE INDEX idx_download_data_columns_table ON config_schema.tb_download_data_columns USING btree (data_table_id);
