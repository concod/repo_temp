--liquibase formatted sql
--changeset liquibase:tb_fc_form_instance_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_fc_form_instance_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_fc_form_instance_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_fc_form_instance stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_fc_form_instance

CREATE TABLE config_schema.tb_fc_form_instance (
	id integer DEFAULT nextval('config_schema.tb_fc_form_instance_id_seq'::regclass) NOT NULL,
	form_id integer NOT NULL,
	instance_name varchar(200),
	status varchar(30) DEFAULT 'draft'::character varying,
	current_step integer DEFAULT 0,
	completed_steps jsonb DEFAULT '[]'::jsonb,
	created_by integer NOT NULL,
	created_at timestamp with time zone DEFAULT now(),
	updated_at timestamp with time zone DEFAULT now(),
	CONSTRAINT tb_fc_form_instance_pkey PRIMARY KEY (id),
	CONSTRAINT tb_fc_form_instance_form_id_fkey FOREIGN KEY (form_id) REFERENCES config_schema.tb_fc_form(id)
);
CREATE INDEX idx_tb_fc_form_instance_form ON config_schema.tb_fc_form_instance USING btree (form_id);
CREATE INDEX idx_tb_fc_form_instance_status ON config_schema.tb_fc_form_instance USING btree (status);
