--liquibase formatted sql
--changeset liquibase:tb_filter_configurations_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_filter_configurations_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_filter_configurations_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_filter_configurations stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_filter_configurations

CREATE TABLE config_schema.tb_filter_configurations (
	id integer DEFAULT nextval('config_schema.tb_filter_configurations_id_seq'::regclass) NOT NULL,
	section_config_id integer,
	screen_config_id integer,
	filter_dimension_id varchar(100) NOT NULL,
	filter_dimension_code varchar(100) NOT NULL,
	filter_dimension_name varchar(255) NOT NULL,
	display_order integer DEFAULT 0,
	is_collapsible boolean DEFAULT true,
	default_open boolean DEFAULT false,
	icon_path varchar(255),
	data_source_api varchar(255),
	created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
	updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
	config_key varchar(100),
	section_type varchar(50),
	CONSTRAINT tb_filter_configurations_pkey PRIMARY KEY (id),
	CONSTRAINT tb_filter_configurations_screen_config_id_fkey FOREIGN KEY (screen_config_id) REFERENCES config_schema.tb_screen_configurations(id) ON DELETE CASCADE,
	CONSTRAINT tb_filter_configurations_section_config_id_fkey FOREIGN KEY (section_config_id) REFERENCES config_schema.tb_section_configurations(id) ON DELETE CASCADE,
	CONSTRAINT chk_filter_scope CHECK ((((section_config_id IS NOT NULL) AND (screen_config_id IS NULL)) OR ((section_config_id IS NULL) AND (screen_config_id IS NOT NULL))))
);
CREATE INDEX idx_filter_screen ON config_schema.tb_filter_configurations USING btree (screen_config_id) WHERE (screen_config_id IS NOT NULL);
CREATE INDEX idx_filter_section ON config_schema.tb_filter_configurations USING btree (section_config_id) WHERE (section_config_id IS NOT NULL);
CREATE UNIQUE INDEX uq_filter_section_group ON config_schema.tb_filter_configurations USING btree (section_config_id, filter_dimension_id) WHERE (section_config_id IS NOT NULL);
CREATE INDEX idx_filter_config_key ON config_schema.tb_filter_configurations USING btree (config_key);
CREATE UNIQUE INDEX uq_filter_section_dimension ON config_schema.tb_filter_configurations USING btree (section_config_id, filter_dimension_id) WHERE (section_config_id IS NOT NULL);
CREATE UNIQUE INDEX uq_filter_screen_dimension ON config_schema.tb_filter_configurations USING btree (screen_config_id, filter_dimension_id, COALESCE(config_key, ''::character varying)) WHERE (screen_config_id IS NOT NULL);
