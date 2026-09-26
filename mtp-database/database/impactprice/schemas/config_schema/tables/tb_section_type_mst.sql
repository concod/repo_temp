--liquibase formatted sql
--changeset liquibase:tb_section_type_mst_section_type_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_section_type_mst_section_type_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_section_type_mst_section_type_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_section_type_mst stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_section_type_mst

CREATE TABLE config_schema.tb_section_type_mst (
	section_type_id integer DEFAULT nextval('config_schema.tb_section_type_mst_section_type_id_seq'::regclass) NOT NULL,
	type_code varchar(50) NOT NULL,
	type_name varchar(100) NOT NULL,
	type_description text,
	default_config jsonb,
	is_active boolean DEFAULT true,
	created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT tb_section_type_mst_type_code_key UNIQUE (type_code),
	CONSTRAINT tb_section_type_mst_pkey PRIMARY KEY (section_type_id)
);
CREATE INDEX idx_section_type_code ON config_schema.tb_section_type_mst USING btree (type_code);
