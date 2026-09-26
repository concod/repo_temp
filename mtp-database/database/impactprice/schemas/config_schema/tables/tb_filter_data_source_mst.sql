--liquibase formatted sql
--changeset liquibase:tb_filter_data_source_mst_data_source_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_filter_data_source_mst_data_source_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_filter_data_source_mst_data_source_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_filter_data_source_mst stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_filter_data_source_mst

CREATE TABLE config_schema.tb_filter_data_source_mst (
	data_source_id integer DEFAULT nextval('config_schema.tb_filter_data_source_mst_data_source_id_seq'::regclass) NOT NULL,
	data_source_code varchar(100) NOT NULL,
	data_source_name varchar(255) NOT NULL,
	data_source_type varchar(50) NOT NULL,
	database_object varchar(255),
	query_text text,
	schema_name varchar(100) DEFAULT 'public'::character varying,
	api_endpoint varchar(500),
	api_method varchar(10) DEFAULT 'GET'::character varying,
	api_headers jsonb,
	api_timeout_seconds integer DEFAULT 30,
	value_field varchar(100) NOT NULL,
	label_field varchar(100) NOT NULL,
	additional_fields jsonb,
	filter_conditions text,
	required_params jsonb,
	optional_params jsonb,
	default_params jsonb,
	default_sort_field varchar(100),
	default_sort_direction varchar(10) DEFAULT 'ASC'::character varying,
	enable_caching boolean DEFAULT true,
	cache_ttl_seconds integer DEFAULT 300,
	max_records integer DEFAULT 1000,
	description text,
	is_active boolean DEFAULT true,
	created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
	updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
	created_by varchar(100),
	updated_by varchar(100),
	CONSTRAINT tb_filter_data_source_mst_data_source_code_key UNIQUE (data_source_code),
	CONSTRAINT tb_filter_data_source_mst_pkey PRIMARY KEY (data_source_id),
	CONSTRAINT chk_api_source CHECK (((((data_source_type)::text = 'api'::text) AND (api_endpoint IS NOT NULL)) OR ((data_source_type)::text <> 'api'::text))),
	CONSTRAINT chk_data_source_type CHECK (((data_source_type)::text = ANY (ARRAY[('table'::character varying)::text, ('query'::character varying)::text, ('view'::character varying)::text, ('function'::character varying)::text, ('api'::character varying)::text]))),
	CONSTRAINT chk_function_source CHECK (((((data_source_type)::text = 'function'::text) AND (database_object IS NOT NULL)) OR ((data_source_type)::text <> 'function'::text))),
	CONSTRAINT chk_query_source CHECK (((((data_source_type)::text = 'query'::text) AND (query_text IS NOT NULL)) OR ((data_source_type)::text <> 'query'::text))),
	CONSTRAINT chk_table_source CHECK (((((data_source_type)::text = 'table'::text) AND (database_object IS NOT NULL)) OR ((data_source_type)::text <> 'table'::text))),
	CONSTRAINT chk_view_source CHECK (((((data_source_type)::text = 'view'::text) AND (database_object IS NOT NULL)) OR ((data_source_type)::text <> 'view'::text)))
);
CREATE INDEX idx_filter_ds_active ON config_schema.tb_filter_data_source_mst USING btree (is_active) WHERE (is_active = true);
CREATE INDEX idx_filter_ds_code ON config_schema.tb_filter_data_source_mst USING btree (data_source_code);
CREATE INDEX idx_filter_ds_schema ON config_schema.tb_filter_data_source_mst USING btree (schema_name, database_object) WHERE ((data_source_type)::text = ANY (ARRAY[('table'::character varying)::text, ('view'::character varying)::text, ('function'::character varying)::text]));
CREATE INDEX idx_filter_ds_type ON config_schema.tb_filter_data_source_mst USING btree (data_source_type);
