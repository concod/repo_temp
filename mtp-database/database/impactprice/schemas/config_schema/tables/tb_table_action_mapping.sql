--liquibase formatted sql
--changeset liquibase:tb_table_action_mapping_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_table_action_mapping_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_table_action_mapping_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_table_action_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_table_action_mapping

CREATE TABLE config_schema.tb_table_action_mapping (
	id integer DEFAULT nextval('config_schema.tb_table_action_mapping_id_seq'::regclass) NOT NULL,
	table_config_id integer NOT NULL,
	action_config_id integer NOT NULL,
	sort_order integer DEFAULT 0,
	override_config jsonb DEFAULT '{}'::jsonb,
	is_active boolean DEFAULT true,
	created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
	source_type varchar(30) DEFAULT 'selected_rows'::character varying,
	source_column_code varchar(100),
	source_value_path varchar(255),
	target_field_path varchar(255),
	transform_type varchar(50),
	transform_config jsonb,
	default_value jsonb,
	is_required boolean DEFAULT false,
	mapping_order integer DEFAULT 0,
	description varchar(500),
	updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT tb_table_action_mapping_table_config_id_action_config_id_key UNIQUE (table_config_id, action_config_id),
	CONSTRAINT tb_table_action_mapping_pkey PRIMARY KEY (id),
	CONSTRAINT tb_table_action_mapping_action_config_id_fkey FOREIGN KEY (action_config_id) REFERENCES config_schema.tb_table_action_config(id) ON DELETE CASCADE,
	CONSTRAINT tb_table_action_mapping_table_config_id_fkey FOREIGN KEY (table_config_id) REFERENCES config_schema.tb_table_configurations(id) ON DELETE CASCADE
);
CREATE INDEX idx_action_mapping_action ON config_schema.tb_table_action_mapping USING btree (action_config_id);
CREATE INDEX idx_action_mapping_order ON config_schema.tb_table_action_mapping USING btree (mapping_order);
CREATE INDEX idx_action_mapping_table ON config_schema.tb_table_action_mapping USING btree (table_config_id);
