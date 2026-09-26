--liquibase formatted sql
--changeset liquibase:tb_filter_action_param_mapping_mapping_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_filter_action_param_mapping_mapping_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_filter_action_param_mapping_mapping_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_filter_action_param_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_filter_action_param_mapping

CREATE TABLE config_schema.tb_filter_action_param_mapping (
	mapping_id integer DEFAULT nextval('config_schema.tb_filter_action_param_mapping_mapping_id_seq'::regclass) NOT NULL,
	action_id integer NOT NULL,
	source_control_code varchar(100) NOT NULL,
	source_value_path varchar(255) DEFAULT ''::character varying,
	target_field_path varchar(255) NOT NULL,
	transform_type varchar(50) DEFAULT 'none'::character varying,
	transform_config jsonb,
	default_value jsonb,
	is_required boolean DEFAULT false,
	mapping_order integer DEFAULT 0,
	description text,
	created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
	updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT tb_filter_action_param_mapping_pkey PRIMARY KEY (mapping_id),
	CONSTRAINT fk_param_mapping_action FOREIGN KEY (action_id) REFERENCES config_schema.tb_filter_action_config(action_id) ON DELETE CASCADE,
	CONSTRAINT chk_transform_type CHECK (((transform_type)::text = ANY ((ARRAY['none'::character varying, 'join'::character varying, 'first'::character varying, 'flatten'::character varying, 'date_format'::character varying, 'template'::character varying, 'json_stringify'::character varying, 'to_array'::character varying])::text[])))
);
CREATE INDEX idx_param_mapping_action ON config_schema.tb_filter_action_param_mapping USING btree (action_id);
CREATE INDEX idx_param_mapping_order ON config_schema.tb_filter_action_param_mapping USING btree (action_id, mapping_order);
