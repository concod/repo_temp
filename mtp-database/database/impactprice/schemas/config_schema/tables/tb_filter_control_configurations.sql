--liquibase formatted sql
--changeset liquibase:tb_filter_control_configurations_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_filter_control_configurations_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_filter_control_configurations_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_filter_control_configurations stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_filter_control_configurations

CREATE TABLE config_schema.tb_filter_control_configurations (
	id integer DEFAULT nextval('config_schema.tb_filter_control_configurations_id_seq'::regclass) NOT NULL,
	filter_config_id integer,
	control_id varchar(100) NOT NULL,
	control_code varchar(100) NOT NULL,
	control_type_id integer NOT NULL,
	label varchar(255) NOT NULL,
	display_order integer DEFAULT 0,
	display_row integer DEFAULT 0,
	display_column integer DEFAULT 0,
	column_span integer DEFAULT 1,
	is_multi_select boolean DEFAULT false,
	is_mandatory boolean DEFAULT false,
	is_searchable boolean DEFAULT true,
	is_clearable boolean DEFAULT true,
	select_on_load boolean DEFAULT false,
	default_selection varchar(50),
	default_value jsonb,
	api_endpoint varchar(255),
	api_method varchar(10) DEFAULT 'GET'::character varying,
	api_params jsonb,
	response_mapping jsonb,
	dependent_on jsonb,
	cascading_config jsonb,
	placeholder varchar(255),
	help_text varchar(500),
	validation_rules jsonb,
	conditional_visibility jsonb,
	min_date_offset integer,
	max_date_offset integer,
	date_format varchar(50) DEFAULT 'MM-DD-YYYY'::character varying,
	static_options jsonb,
	created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
	updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
	parent_control_id integer,
	parent_value_field varchar(100) DEFAULT 'value'::character varying,
	child_param_name varchar(100),
	auto_load_on_parent_change boolean DEFAULT true,
	clear_on_parent_change boolean DEFAULT true,
	loading_message varchar(255) DEFAULT 'Loading...'::character varying,
	no_data_message varchar(255) DEFAULT 'No options available'::character varying,
	filter_section_id integer,
	value_datatype varchar(20) DEFAULT 'string'::character varying,
	date_output_format varchar(50),
	api_endpoint_type varchar(20),
	rolling_range_config jsonb,
	date_range_modes jsonb,
	saved_filters_config jsonb,
	enable_data_from varchar(100),
	default_start_offset jsonb,
	default_end_offset jsonb,
	default_specific_values varchar(500),
	copy_paste_config jsonb,
	upload_config jsonb,
	is_always_enabled boolean DEFAULT false NOT NULL,
	table_config jsonb,
	CONSTRAINT tb_filter_control_configuration_filter_config_id_control_id_key UNIQUE (filter_config_id, control_id),
	CONSTRAINT tb_filter_control_configurations_pkey PRIMARY KEY (id),
	CONSTRAINT tb_filter_control_configurations_control_type_id_fkey FOREIGN KEY (control_type_id) REFERENCES config_schema.tb_filter_control_type_mst(control_type_id) ON DELETE RESTRICT,
	CONSTRAINT tb_filter_control_configurations_filter_config_id_fkey FOREIGN KEY (filter_config_id) REFERENCES config_schema.tb_filter_configurations(id) ON DELETE CASCADE,
	CONSTRAINT tb_filter_control_configurations_filter_section_id_fkey FOREIGN KEY (filter_section_id) REFERENCES config_schema.tb_filter_sections(id) ON DELETE CASCADE,
	CONSTRAINT tb_filter_control_configurations_parent_control_id_fkey FOREIGN KEY (parent_control_id) REFERENCES config_schema.tb_filter_control_configurations(id) ON DELETE SET NULL
);
CREATE INDEX idx_control_section ON config_schema.tb_filter_control_configurations USING btree (filter_section_id);
CREATE INDEX idx_filter_control_cascading_gin ON config_schema.tb_filter_control_configurations USING gin (cascading_config);
CREATE INDEX idx_filter_control_filter ON config_schema.tb_filter_control_configurations USING btree (filter_config_id);
CREATE INDEX idx_filter_control_filter_type ON config_schema.tb_filter_control_configurations USING btree (filter_config_id, control_type_id);
CREATE INDEX idx_filter_control_order ON config_schema.tb_filter_control_configurations USING btree (filter_config_id, display_order);
CREATE INDEX idx_filter_control_parent ON config_schema.tb_filter_control_configurations USING btree (parent_control_id);
CREATE INDEX idx_filter_control_type ON config_schema.tb_filter_control_configurations USING btree (control_type_id);
