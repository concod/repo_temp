--liquibase formatted sql
--changeset liquibase:tb_tile_configurations_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_tile_configurations_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_tile_configurations_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_tile_configurations stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_tile_configurations

CREATE TABLE config_schema.tb_tile_configurations (
	id integer DEFAULT nextval('config_schema.tb_tile_configurations_id_seq'::regclass) NOT NULL,
	section_config_id integer,
	tile_id varchar(100) NOT NULL,
	tile_code varchar(100) NOT NULL,
	tile_label varchar(255) NOT NULL,
	data_key varchar(100) NOT NULL,
	display_order integer DEFAULT 0,
	is_visible boolean DEFAULT true,
	formatter_type_id integer,
	formatter_options jsonb,
	icon_path varchar(255),
	icon_color varchar(50),
	background_color varchar(50),
	tooltip varchar(255),
	trend_indicator boolean DEFAULT false,
	trend_key varchar(100),
	click_action jsonb,
	size varchar(20) DEFAULT 'medium'::character varying,
	created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
	updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT tb_tile_configurations_section_config_id_tile_id_key UNIQUE (section_config_id, tile_id),
	CONSTRAINT tb_tile_configurations_pkey PRIMARY KEY (id),
	CONSTRAINT tb_tile_configurations_section_config_id_fkey FOREIGN KEY (section_config_id) REFERENCES config_schema.tb_section_configurations(id) ON DELETE CASCADE
);
CREATE INDEX idx_tile_formatter ON config_schema.tb_tile_configurations USING btree (formatter_type_id);
CREATE INDEX idx_tile_section ON config_schema.tb_tile_configurations USING btree (section_config_id);
CREATE INDEX idx_tile_section_visible ON config_schema.tb_tile_configurations USING btree (section_config_id, is_visible) WHERE (is_visible = true);
CREATE INDEX idx_tile_visible ON config_schema.tb_tile_configurations USING btree (is_visible);
CREATE INDEX idx_tile_visible_only ON config_schema.tb_tile_configurations USING btree (section_config_id, display_order) WHERE (is_visible = true);
