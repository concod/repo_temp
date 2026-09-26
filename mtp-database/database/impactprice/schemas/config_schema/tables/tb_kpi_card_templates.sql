--liquibase formatted sql
--changeset liquibase:tb_kpi_card_templates_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_kpi_card_templates_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_kpi_card_templates_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_kpi_card_templates stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_kpi_card_templates

CREATE TABLE config_schema.tb_kpi_card_templates (
	id integer DEFAULT nextval('config_schema.tb_kpi_card_templates_id_seq'::regclass) NOT NULL,
	template_code varchar(100) NOT NULL,
	template_name varchar(255) NOT NULL,
	description text,
	template_structure jsonb DEFAULT '{}'::jsonb NOT NULL,
	preview_thumbnail text,
	default_styles jsonb DEFAULT '{}'::jsonb,
	supported_sizes jsonb DEFAULT '["small", "medium", "large"]'::jsonb,
	is_system boolean DEFAULT false,
	is_active boolean DEFAULT true,
	created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
	updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
	created_by varchar(100),
	updated_by varchar(100),
	CONSTRAINT tb_kpi_card_templates_template_code_key UNIQUE (template_code),
	CONSTRAINT tb_kpi_card_templates_pkey PRIMARY KEY (id)
);
