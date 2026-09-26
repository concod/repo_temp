--liquibase formatted sql
--changeset liquibase:tb_fc_control_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_fc_control_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_fc_control_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_fc_control stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_fc_control

CREATE TABLE config_schema.tb_fc_control (
	id integer DEFAULT nextval('config_schema.tb_fc_control_id_seq'::regclass) NOT NULL,
	step_id integer NOT NULL,
	control_code varchar(100) NOT NULL,
	display_name varchar(200) NOT NULL,
	control_tier varchar(20) NOT NULL,
	control_type varchar(50) NOT NULL,
	display_order integer NOT NULL,
	grid_column_span integer DEFAULT 1,
	width varchar(20),
	height varchar(20),
	icon varchar(100),
	css_class varchar(200),
	group_code varchar(100),
	data_type varchar(30),
	value_type varchar(20),
	placeholder varchar(200),
	default_value jsonb,
	is_mandatory boolean DEFAULT false,
	is_readonly boolean DEFAULT false,
	is_visible boolean DEFAULT true,
	is_disabled boolean DEFAULT false,
	data_source_type varchar(30),
	data_source_config jsonb,
	validation_rules jsonb,
	success_icon varchar(100),
	success_message varchar(200),
	failure_icon varchar(100),
	failure_message varchar(200),
	depends_on jsonb,
	composite_config jsonb,
	db_column_name varchar(100),
	db_column_type varchar(50),
	is_db_indexed boolean DEFAULT false,
	is_active boolean DEFAULT true,
	CONSTRAINT tb_fc_control_step_id_control_code_key UNIQUE (step_id, control_code),
	CONSTRAINT tb_fc_control_pkey PRIMARY KEY (id),
	CONSTRAINT tb_fc_control_step_id_fkey FOREIGN KEY (step_id) REFERENCES config_schema.tb_fc_step(id) ON DELETE CASCADE
);
CREATE INDEX idx_tb_fc_control_step ON config_schema.tb_fc_control USING btree (step_id);
CREATE INDEX idx_tb_fc_control_tier ON config_schema.tb_fc_control USING btree (control_tier);
