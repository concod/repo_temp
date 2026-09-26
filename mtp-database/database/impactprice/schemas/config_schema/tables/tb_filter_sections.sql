--liquibase formatted sql
--changeset liquibase:tb_filter_sections_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_filter_sections_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_filter_sections_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_filter_sections stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_filter_sections

CREATE TABLE config_schema.tb_filter_sections (
	id integer DEFAULT nextval('config_schema.tb_filter_sections_id_seq'::regclass) NOT NULL,
	filter_config_id integer NOT NULL,
	section_id varchar(100) NOT NULL,
	section_code varchar(100) NOT NULL,
	section_name varchar(255) NOT NULL,
	display_order integer DEFAULT 0,
	is_default boolean DEFAULT false,
	is_visible boolean DEFAULT true,
	icon_path varchar(255),
	section_type varchar(50),
	custom_config jsonb,
	created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
	updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
	description text,
	CONSTRAINT tb_filter_sections_filter_config_id_section_id_key UNIQUE (filter_config_id, section_id),
	CONSTRAINT tb_filter_sections_pkey PRIMARY KEY (id),
	CONSTRAINT tb_filter_sections_filter_config_id_fkey FOREIGN KEY (filter_config_id) REFERENCES config_schema.tb_filter_configurations(id) ON DELETE CASCADE
);
CREATE INDEX idx_filter_section_default ON config_schema.tb_filter_sections USING btree (filter_config_id, is_default) WHERE (is_default = true);
CREATE INDEX idx_filter_section_dimension ON config_schema.tb_filter_sections USING btree (filter_config_id);
CREATE INDEX idx_filter_section_order ON config_schema.tb_filter_sections USING btree (filter_config_id, display_order);
