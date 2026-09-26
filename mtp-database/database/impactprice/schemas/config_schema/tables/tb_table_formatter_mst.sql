--liquibase formatted sql
--changeset liquibase:tb_table_formatter_mst_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_table_formatter_mst_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_table_formatter_mst_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_table_formatter_mst stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_table_formatter_mst

CREATE TABLE config_schema.tb_table_formatter_mst (
	id integer DEFAULT nextval('config_schema.tb_table_formatter_mst_id_seq'::regclass) NOT NULL,
	application_id integer NOT NULL,
	formatter_code varchar(100) NOT NULL,
	formatter_name varchar(255) NOT NULL,
	description text,
	is_active boolean DEFAULT true,
	created_at timestamp without time zone DEFAULT now(),
	updated_at timestamp without time zone DEFAULT now(),
	CONSTRAINT tb_table_formatter_mst_application_id_formatter_code_key UNIQUE (application_id, formatter_code),
	CONSTRAINT tb_table_formatter_mst_pkey PRIMARY KEY (id),
	CONSTRAINT tb_table_formatter_mst_application_id_fkey FOREIGN KEY (application_id) REFERENCES config_schema.tb_application_mst(id) ON DELETE CASCADE
);
CREATE INDEX idx_table_formatter_app ON config_schema.tb_table_formatter_mst USING btree (application_id);
