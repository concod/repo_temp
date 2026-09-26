--liquibase formatted sql
--changeset liquibase:tb_client_mst_client_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_client_mst_client_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_client_mst_client_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_client_mst stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_client_mst

CREATE TABLE config_schema.tb_client_mst (
	client_id integer DEFAULT nextval('config_schema.tb_client_mst_client_id_seq'::regclass) NOT NULL,
	client_code varchar(50) NOT NULL,
	client_name varchar(255) NOT NULL,
	client_description text,
	is_active boolean DEFAULT true,
	display_order integer DEFAULT 0,
	meta_data jsonb,
	created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
	updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
	created_by varchar(100),
	updated_by varchar(100),
	CONSTRAINT tb_client_mst_client_code_key UNIQUE (client_code),
	CONSTRAINT tb_client_mst_pkey PRIMARY KEY (client_id)
);
CREATE INDEX idx_client_active ON config_schema.tb_client_mst USING btree (is_active);
CREATE INDEX idx_client_code ON config_schema.tb_client_mst USING btree (client_code);
