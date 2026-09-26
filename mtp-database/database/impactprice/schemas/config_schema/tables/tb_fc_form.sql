--liquibase formatted sql
--changeset liquibase:tb_fc_form_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_fc_form_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_fc_form_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_fc_form stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_fc_form

CREATE TABLE config_schema.tb_fc_form (
	id integer DEFAULT nextval('config_schema.tb_fc_form_id_seq'::regclass) NOT NULL,
	form_code varchar(100) NOT NULL,
	form_name varchar(200) NOT NULL,
	module varchar(50) NOT NULL,
	description text,
	layout_type varchar(20) DEFAULT 'stepper'::character varying,
	storage_strategy varchar(20) DEFAULT 'unified'::character varying,
	version integer DEFAULT 1,
	is_published boolean DEFAULT false,
	is_active boolean DEFAULT true,
	created_by integer,
	created_at timestamp with time zone DEFAULT now(),
	updated_at timestamp with time zone DEFAULT now(),
	CONSTRAINT tb_fc_form_form_code_key UNIQUE (form_code),
	CONSTRAINT tb_fc_form_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_tb_fc_form_module ON config_schema.tb_fc_form USING btree (module);
CREATE INDEX idx_tb_fc_form_active ON config_schema.tb_fc_form USING btree (is_active);
