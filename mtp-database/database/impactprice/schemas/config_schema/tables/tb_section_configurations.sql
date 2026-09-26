--liquibase formatted sql
--changeset liquibase:tb_section_configurations_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_section_configurations_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_section_configurations_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_section_configurations stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_section_configurations

CREATE TABLE config_schema.tb_section_configurations (
	id integer DEFAULT nextval('config_schema.tb_section_configurations_id_seq'::regclass) NOT NULL,
	screen_config_id integer,
	section_id varchar(100) NOT NULL,
	section_code varchar(100) NOT NULL,
	section_name varchar(255) NOT NULL,
	section_type_id integer NOT NULL,
	display_order integer DEFAULT 0,
	is_visible boolean DEFAULT true,
	is_collapsible boolean DEFAULT false,
	default_collapsed boolean DEFAULT false,
	custom_styles jsonb,
	layout_config jsonb,
	created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
	updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
	parent_section_id integer,
	grid_column_span integer DEFAULT 12,
	grid_row_index integer DEFAULT 0,
	CONSTRAINT tb_section_configurations_screen_config_id_section_id_key UNIQUE (screen_config_id, section_id),
	CONSTRAINT tb_section_configurations_pkey PRIMARY KEY (id),
	CONSTRAINT fk_section_parent FOREIGN KEY (parent_section_id) REFERENCES config_schema.tb_section_configurations(id) ON DELETE CASCADE,
	CONSTRAINT tb_section_configurations_screen_config_id_fkey FOREIGN KEY (screen_config_id) REFERENCES config_schema.tb_screen_configurations(id) ON DELETE CASCADE,
	CONSTRAINT tb_section_configurations_section_type_id_fkey FOREIGN KEY (section_type_id) REFERENCES config_schema.tb_section_type_mst(section_type_id) ON DELETE RESTRICT,
	CONSTRAINT chk_grid_column_span CHECK (((grid_column_span >= 1) AND (grid_column_span <= 12))),
	CONSTRAINT chk_grid_row_index CHECK ((grid_row_index >= 0))
);
CREATE INDEX idx_section_grid_row ON config_schema.tb_section_configurations USING btree (screen_config_id, grid_row_index);
CREATE INDEX idx_section_layout_config_gin ON config_schema.tb_section_configurations USING gin (layout_config);
CREATE INDEX idx_section_parent_id ON config_schema.tb_section_configurations USING btree (parent_section_id) WHERE (parent_section_id IS NOT NULL);
CREATE INDEX idx_section_screen ON config_schema.tb_section_configurations USING btree (screen_config_id);
CREATE INDEX idx_section_screen_type ON config_schema.tb_section_configurations USING btree (screen_config_id, section_type_id);
CREATE INDEX idx_section_screen_visible ON config_schema.tb_section_configurations USING btree (screen_config_id, is_visible) WHERE (is_visible = true);
CREATE INDEX idx_section_type ON config_schema.tb_section_configurations USING btree (section_type_id);
CREATE INDEX idx_section_visible ON config_schema.tb_section_configurations USING btree (is_visible);
CREATE INDEX idx_section_visible_only ON config_schema.tb_section_configurations USING btree (screen_config_id, display_order) WHERE (is_visible = true);
