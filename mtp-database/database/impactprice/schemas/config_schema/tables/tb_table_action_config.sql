--liquibase formatted sql
--changeset liquibase:tb_table_action_config_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_table_action_config_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_table_action_config_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_table_action_config stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_table_action_config

CREATE TABLE config_schema.tb_table_action_config (
	id integer DEFAULT nextval('config_schema.tb_table_action_config_id_seq'::regclass) NOT NULL,
	action_name varchar(100) NOT NULL,
	action_type varchar(50) NOT NULL,
	display_text varchar(200),
	icon_path varchar(500),
	action_behavior varchar(50) NOT NULL,
	action_behavior_config jsonb DEFAULT '{}'::jsonb,
	action_api_config jsonb DEFAULT '{}'::jsonb,
	visibility_rules jsonb DEFAULT '{}'::jsonb,
	action_render_type varchar(50) DEFAULT 'button'::character varying,
	action_render_config jsonb DEFAULT '{}'::jsonb,
	is_active boolean DEFAULT true,
	created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
	updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
	action_code varchar(100),
	action_label varchar(255),
	action_tooltip varchar(255),
	action_position varchar(30) DEFAULT 'toolbar'::character varying,
	action_icon varchar(100),
	is_bulk_action boolean DEFAULT false,
	requires_selection boolean DEFAULT false,
	min_selection integer DEFAULT 0,
	max_selection integer,
	confirmation_required boolean DEFAULT false,
	confirmation_message text,
	endpoint_url varchar(500),
	http_method varchar(10) DEFAULT 'POST'::character varying,
	download_type varchar(20),
	download_format varchar(20),
	pre_transform jsonb,
	error_handling jsonb DEFAULT '{"strategy": "toast", "retryCount": 0}'::jsonb,
	display_order integer DEFAULT 0,
	keyboard_shortcut varchar(50),
	created_by varchar(100),
	updated_by varchar(100),
	CONSTRAINT tb_table_action_config_action_name_key UNIQUE (action_name),
	CONSTRAINT tb_table_action_config_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_action_config_active ON config_schema.tb_table_action_config USING btree (is_active);
CREATE INDEX idx_table_action_active ON config_schema.tb_table_action_config USING btree (is_active);
CREATE INDEX idx_table_action_order ON config_schema.tb_table_action_config USING btree (display_order);
CREATE INDEX idx_table_action_type ON config_schema.tb_table_action_config USING btree (action_type);
