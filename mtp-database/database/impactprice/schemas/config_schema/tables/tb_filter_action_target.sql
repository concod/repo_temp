--liquibase formatted sql
--changeset liquibase:tb_filter_action_target_target_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_filter_action_target_target_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_filter_action_target_target_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_filter_action_target stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_filter_action_target

CREATE TABLE config_schema.tb_filter_action_target (
	target_id integer DEFAULT nextval('config_schema.tb_filter_action_target_target_id_seq'::regclass) NOT NULL,
	action_id integer NOT NULL,
	target_type varchar(50) NOT NULL,
	target_code varchar(100) NOT NULL,
	response_data_path varchar(255) DEFAULT 'data'::character varying,
	target_config jsonb,
	response_transform jsonb,
	is_active boolean DEFAULT true,
	created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
	updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT tb_filter_action_target_pkey PRIMARY KEY (target_id),
	CONSTRAINT fk_action_target_action FOREIGN KEY (action_id) REFERENCES config_schema.tb_filter_action_config(action_id) ON DELETE CASCADE,
	CONSTRAINT chk_target_type CHECK (((target_type)::text = ANY ((ARRAY['table'::character varying, 'tile'::character varying, 'chart'::character varying, 'state'::character varying, 'callback'::character varying, 'filter'::character varying])::text[])))
);
CREATE INDEX idx_action_target_action ON config_schema.tb_filter_action_target USING btree (action_id);
CREATE INDEX idx_action_target_type_code ON config_schema.tb_filter_action_target USING btree (target_type, target_code);
CREATE INDEX idx_action_target_active ON config_schema.tb_filter_action_target USING btree (is_active) WHERE (is_active = true);
