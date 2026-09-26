--liquibase formatted sql
--changeset liquibase:tb_download_joins_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_download_joins_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_download_joins_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_download_joins stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_download_joins

CREATE TABLE config_schema.tb_download_joins (
	id integer DEFAULT nextval('config_schema.tb_download_joins_id_seq'::regclass) NOT NULL,
	download_config_id integer NOT NULL,
	left_table_type varchar(10) NOT NULL,
	left_table_id integer NOT NULL,
	right_table_type varchar(10) NOT NULL,
	right_table_id integer NOT NULL,
	join_type varchar(20) DEFAULT 'INNER'::character varying,
	left_column varchar(255) NOT NULL,
	right_column varchar(255) NOT NULL,
	join_order integer DEFAULT 0,
	is_active boolean DEFAULT true,
	created_at timestamp without time zone DEFAULT now(),
	updated_at timestamp without time zone DEFAULT now(),
	operator varchar(20) DEFAULT '='::character varying,
	right_value_type varchar(10) DEFAULT 'single'::character varying,
	CONSTRAINT tb_download_joins_pkey PRIMARY KEY (id),
	CONSTRAINT tb_download_joins_download_config_id_fkey FOREIGN KEY (download_config_id) REFERENCES config_schema.tb_download_configurations(id) ON DELETE CASCADE
);
CREATE INDEX idx_download_joins_config ON config_schema.tb_download_joins USING btree (download_config_id);
