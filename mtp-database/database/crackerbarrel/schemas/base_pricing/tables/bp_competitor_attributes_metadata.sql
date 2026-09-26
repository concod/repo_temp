--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_competitor_attributes_metadata stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_competitor_attributes_metadata

CREATE TABLE base_pricing.bp_competitor_attributes_metadata (
	attribute_id serial4 NOT NULL,
	attribute_name varchar(50) NOT NULL,
	frontend_display_name varchar(100) NOT NULL,
	data_type varchar(50) NOT NULL,
	input_type varchar(50) NULL,
	input_values jsonb NULL,
	input_validation_ids _int4 DEFAULT '{}'::integer[] NOT NULL,
	default_visibility bool DEFAULT false NOT NULL,
	is_static bool DEFAULT false NOT NULL,
	is_dynamic bool DEFAULT false NOT NULL,
	is_editable_from_app bool DEFAULT true NOT NULL,
	is_editable_from_file bool DEFAULT true NOT NULL,
	is_filterable bool DEFAULT false NOT NULL,
	column_order int2 NULL,
	cell_render_params jsonb DEFAULT '[]'::jsonb NULL,
	is_active bool DEFAULT true NOT NULL,
	cell_render_type varchar(50) NULL,
	comparison_attributes _varchar DEFAULT '{}'::character varying(50)[] NULL,
	column_data_format varchar NULL,
	attribute_update_level varchar NULL,
	database_column varchar(50) NULL,
	report_display_name varchar(100) NULL,
	is_competitive_rule bool DEFAULT true NULL,
	is_resettable bool DEFAULT false NOT NULL,
	extra_params jsonb DEFAULT '[]'::jsonb NULL,
	depends_on varchar NULL,
	rule_types jsonb DEFAULT '[]'::jsonb NULL,
	product_store_impacted_attributes _varchar DEFAULT '{}'::character varying[] NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT bp_competitor_attributes_metadata_frontend_display_name_key UNIQUE (frontend_display_name),
	CONSTRAINT bp_competitor_attributes_metadata_name_key UNIQUE (attribute_name),
	CONSTRAINT bp_competitor_attributes_metadata_pkey PRIMARY KEY (attribute_id)
);