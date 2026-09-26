--liquibase formatted sql
--changeset liquibase:tb_fc_step_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_fc_step_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_fc_step_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_fc_step stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_fc_step

CREATE TABLE config_schema.tb_fc_step (
	id integer DEFAULT nextval('config_schema.tb_fc_step_id_seq'::regclass) NOT NULL,
	form_id integer NOT NULL,
	step_code varchar(100) NOT NULL,
	step_name varchar(200) NOT NULL,
	step_description text,
	display_order integer NOT NULL,
	icon varchar(100),
	layout_columns integer DEFAULT 2,
	save_on_next boolean DEFAULT false,
	is_optional boolean DEFAULT false,
	is_active boolean DEFAULT true,
	extra_config jsonb,
	CONSTRAINT tb_fc_step_form_id_step_code_key UNIQUE (form_id, step_code),
	CONSTRAINT tb_fc_step_pkey PRIMARY KEY (id),
	CONSTRAINT tb_fc_step_form_id_fkey FOREIGN KEY (form_id) REFERENCES config_schema.tb_fc_form(id) ON DELETE CASCADE
);
CREATE INDEX idx_tb_fc_step_form ON config_schema.tb_fc_step USING btree (form_id);
