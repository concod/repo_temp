--liquibase formatted sql
--changeset liquibase:tb_fc_auto_table_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_fc_auto_table_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_fc_auto_table_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_fc_auto_table stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_fc_auto_table

CREATE TABLE config_schema.tb_fc_auto_table (
	id integer DEFAULT nextval('config_schema.tb_fc_auto_table_id_seq'::regclass) NOT NULL,
	form_id integer NOT NULL,
	step_id integer,
	table_name varchar(200) NOT NULL,
	table_schema varchar(50) DEFAULT 'config_schema'::character varying,
	ddl_hash varchar(64),
	is_created boolean DEFAULT false,
	created_at timestamp with time zone DEFAULT now(),
	updated_at timestamp with time zone DEFAULT now(),
	CONSTRAINT tb_fc_auto_table_pkey PRIMARY KEY (id),
	CONSTRAINT tb_fc_auto_table_form_id_fkey FOREIGN KEY (form_id) REFERENCES config_schema.tb_fc_form(id),
	CONSTRAINT tb_fc_auto_table_step_id_fkey FOREIGN KEY (step_id) REFERENCES config_schema.tb_fc_step(id)
);
CREATE INDEX idx_tb_fc_auto_table_form ON config_schema.tb_fc_auto_table USING btree (form_id);
