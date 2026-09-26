--liquibase formatted sql
--changeset liquibase:tb_column_configurations_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_column_configurations_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_column_configurations_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_table_column_configurations stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_table_column_configurations

CREATE TABLE config_schema.tb_table_column_configurations (
	id integer DEFAULT nextval('config_schema.tb_column_configurations_id_seq'::regclass) NOT NULL,
	table_config_id integer,
	column_id varchar(100) NOT NULL,
	column_code varchar(100) NOT NULL,
	header_name varchar(255) NOT NULL,
	header_tooltip varchar(255),
	display_order integer DEFAULT 0,
	is_visible boolean DEFAULT true,
	is_pinned varchar(10),
	width integer,
	min_width integer DEFAULT 100,
	max_width integer,
	flex integer,
	is_sortable boolean DEFAULT true,
	is_filterable boolean DEFAULT true,
	filter_type varchar(50),
	is_searchable boolean DEFAULT true,
	is_groupable boolean DEFAULT false,
	enable_row_group boolean DEFAULT false,
	enable_pivot boolean DEFAULT false,
	enable_value boolean DEFAULT false,
	formatter_type_id integer,
	formatter_options jsonb,
	cell_renderer varchar(100),
	cell_renderer_params jsonb,
	cell_class varchar(100),
	cell_style jsonb,
	is_editable boolean DEFAULT false,
	editor_type varchar(50),
	editor_params jsonb,
	validation_rules jsonb,
	column_group_id varchar(100),
	column_group_name varchar(255),
	aggregate_function varchar(50),
	value_getter varchar(500),
	column_type varchar(50),
	advance_search_enabled boolean DEFAULT false,
	checkbox_selection boolean DEFAULT false,
	header_checkbox_selection boolean DEFAULT false,
	suppress_menu boolean DEFAULT false,
	created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
	updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
	data_type varchar(50) DEFAULT 'text'::character varying,
	cell_data_type varchar(50),
	value_formatter varchar(500),
	value_parser varchar(500),
	value_setter varchar(500),
	comparator varchar(500),
	header_class varchar(100),
	header_component varchar(100),
	header_component_params jsonb,
	tooltip_field varchar(100),
	tooltip_component varchar(100),
	tooltip_component_params jsonb,
	auto_height boolean DEFAULT false,
	wrap_text boolean DEFAULT false,
	suppress_size_to_fit boolean DEFAULT false,
	suppress_auto_size boolean DEFAULT false,
	suppress_movable boolean DEFAULT false,
	lock_position varchar(10),
	lock_pinned boolean DEFAULT false,
	lock_visible boolean DEFAULT false,
	row_drag boolean DEFAULT false,
	col_span_func varchar(500),
	row_span_func varchar(500),
	text_align varchar(10) DEFAULT 'left'::character varying,
	cell_text_align varchar(10) DEFAULT 'left'::character varying,
	group_config_id integer,
	CONSTRAINT tb_column_configurations_table_config_id_column_id_key UNIQUE (table_config_id, column_id),
	CONSTRAINT tb_column_configurations_pkey PRIMARY KEY (id),
	CONSTRAINT tb_column_configurations_formatter_type_id_fkey FOREIGN KEY (formatter_type_id) REFERENCES config_schema.tb_formatter_type_mst(formatter_type_id) ON DELETE SET NULL,
	CONSTRAINT tb_column_configurations_group_config_id_fkey FOREIGN KEY (group_config_id) REFERENCES config_schema.tb_table_column_group_configurations(id) ON DELETE SET NULL,
	CONSTRAINT tb_column_configurations_table_config_id_fkey FOREIGN KEY (table_config_id) REFERENCES config_schema.tb_table_configurations(id) ON DELETE CASCADE
);
CREATE INDEX idx_column_data_type ON config_schema.tb_table_column_configurations USING btree (data_type);
CREATE INDEX idx_column_formatter ON config_schema.tb_table_column_configurations USING btree (formatter_type_id);
CREATE INDEX idx_column_formatter_options_gin ON config_schema.tb_table_column_configurations USING gin (formatter_options);
CREATE INDEX idx_column_table ON config_schema.tb_table_column_configurations USING btree (table_config_id);
CREATE INDEX idx_column_table_formatter ON config_schema.tb_table_column_configurations USING btree (table_config_id, formatter_type_id);
CREATE INDEX idx_column_table_visible ON config_schema.tb_table_column_configurations USING btree (table_config_id, is_visible) WHERE (is_visible = true);
CREATE INDEX idx_column_visible ON config_schema.tb_table_column_configurations USING btree (is_visible);
CREATE INDEX idx_column_visible_only ON config_schema.tb_table_column_configurations USING btree (table_config_id, display_order) WHERE (is_visible = true);
