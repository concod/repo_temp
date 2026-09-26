--liquibase formatted sql
--changeset liquibase:tb_table_configurations_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_table_configurations_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_table_configurations_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_table_configurations stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_table_configurations

CREATE TABLE config_schema.tb_table_configurations (
	id integer DEFAULT nextval('config_schema.tb_table_configurations_id_seq'::regclass) NOT NULL,
	section_config_id integer,
	table_id varchar(100) NOT NULL,
	table_code varchar(100) NOT NULL,
	table_name varchar(255),
	data_source_api varchar(255),
	available_columns jsonb,
	pagination_enabled boolean DEFAULT true,
	pagination_type varchar(20) DEFAULT 'frontend'::character varying,
	page_size integer DEFAULT 25,
	page_size_options jsonb DEFAULT '[10, 25, 50, 100]'::jsonb,
	row_selection varchar(20) DEFAULT 'multiple'::character varying,
	enable_global_search boolean DEFAULT true,
	enable_column_search boolean DEFAULT true,
	enable_sorting boolean DEFAULT true,
	enable_grouping boolean DEFAULT false,
	enable_row_drag boolean DEFAULT false,
	default_sort_column varchar(100),
	default_sort_direction varchar(10) DEFAULT 'asc'::character varying,
	row_merge_columns jsonb,
	row_merge_config jsonb,
	row_height integer DEFAULT 40,
	header_height integer DEFAULT 48,
	enable_excel_export boolean DEFAULT true,
	enable_column_resize boolean DEFAULT true,
	sticky_header boolean DEFAULT true,
	empty_state_message varchar(255),
	loading_skeleton_rows integer DEFAULT 10,
	created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
	updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
	redux_state_key varchar(100),
	data_source_method varchar(10) DEFAULT 'POST'::character varying,
	data_source_params jsonb,
	data_response_path varchar(255) DEFAULT 'data.rows'::character varying,
	total_count_path varchar(255) DEFAULT 'data.total_count'::character varying,
	refresh_trigger_key varchar(100),
	enable_cell_text_selection boolean DEFAULT true,
	suppress_row_click_selection boolean DEFAULT false,
	animate_rows boolean DEFAULT true,
	enable_range_selection boolean DEFAULT true,
	row_class_rules jsonb,
	get_row_id_field varchar(100),
	enable_charts boolean DEFAULT false,
	side_bar_config jsonb,
	status_bar_config jsonb,
	tooltip_show_delay integer DEFAULT 500,
	overlay_loading_template text,
	overlay_no_rows_template text,
	enable_csv_export boolean DEFAULT true,
	export_file_name varchar(255),
	feature_config jsonb DEFAULT '{}'::jsonb,
	save_view boolean DEFAULT false,
	chat_and_comment boolean DEFAULT false,
	CONSTRAINT tb_table_configurations_section_config_id_table_id_key UNIQUE (section_config_id, table_id),
	CONSTRAINT tb_table_configurations_pkey PRIMARY KEY (id),
	CONSTRAINT tb_table_configurations_section_config_id_fkey FOREIGN KEY (section_config_id) REFERENCES config_schema.tb_section_configurations(id) ON DELETE CASCADE
);
CREATE INDEX idx_table_section ON config_schema.tb_table_configurations USING btree (section_config_id);
