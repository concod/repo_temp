--liquibase formatted sql
--changeset liquibase:tb_filter_action_config_action_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_filter_action_config_action_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_filter_action_config_action_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_filter_action_config stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_filter_action_config

CREATE TABLE config_schema.tb_filter_action_config (
	action_id integer DEFAULT nextval('config_schema.tb_filter_action_config_action_id_seq'::regclass) NOT NULL,
	filter_config_id integer NOT NULL,
	action_code varchar(100) NOT NULL,
	action_name varchar(255) NOT NULL,
	action_type varchar(50) DEFAULT 'api_call'::character varying NOT NULL,
	endpoint_id integer,
	http_method_override varchar(10),
	execution_order integer DEFAULT 0,
	pre_transform jsonb,
	error_handling jsonb,
	action_config jsonb,
	is_active boolean DEFAULT true,
	created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
	updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
	created_by varchar(100),
	updated_by varchar(100),
	CONSTRAINT tb_filter_action_config_action_code_key UNIQUE (action_code),
	CONSTRAINT tb_filter_action_config_pkey PRIMARY KEY (action_id),
	CONSTRAINT fk_filter_action_filter_config FOREIGN KEY (filter_config_id) REFERENCES config_schema.tb_filter_configurations(id) ON DELETE CASCADE,
	CONSTRAINT chk_action_type CHECK (((action_type)::text = ANY ((ARRAY['api_call'::character varying, 'navigate'::character varying, 'export'::character varying, 'custom'::character varying])::text[])))
);
CREATE INDEX idx_filter_action_filter_config ON config_schema.tb_filter_action_config USING btree (filter_config_id);
CREATE INDEX idx_filter_action_endpoint ON config_schema.tb_filter_action_config USING btree (endpoint_id) WHERE (endpoint_id IS NOT NULL);
CREATE INDEX idx_filter_action_active ON config_schema.tb_filter_action_config USING btree (is_active) WHERE (is_active = true);
