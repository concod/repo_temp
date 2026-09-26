
--liquibase formatted sql
--changeset krithika.s@impactanalytics.co:bp_product_attributes_metadata_v1 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_product_attributes_metadata_v1


CREATE TABLE base_pricing.bp_product_attributes_metadata (
	attribute_id serial4 NOT NULL,
	attribute_name varchar(50) NOT NULL,
	frontend_display_name varchar(100) NOT NULL,
	data_type varchar(50) NOT NULL,
	input_type varchar(50) NULL,
	input_values jsonb NULL,
	input_validation_ids _int4 DEFAULT '{}'::integer[] NOT NULL,
	rule_types jsonb DEFAULT '[]'::jsonb NULL,
	default_visibility bool DEFAULT false NOT NULL,
	is_static bool DEFAULT false NOT NULL,
	is_dynamic bool DEFAULT false NOT NULL,
	is_editable_from_app bool DEFAULT true NOT NULL,
	is_editable_from_file bool DEFAULT true NOT NULL,
	is_resettable bool DEFAULT false NOT NULL,
	is_filterable bool DEFAULT false NOT NULL,
	column_order int2 NULL,
	cell_render_params jsonb DEFAULT '[]'::jsonb NULL,
	is_active bool DEFAULT true NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT bp_product_attributes_metadata_frontend_display_name_key UNIQUE (frontend_display_name),
	CONSTRAINT bp_product_attributes_metadata_name_key UNIQUE (attribute_name),
	CONSTRAINT bp_product_attributes_metadata_pkey PRIMARY KEY (attribute_id)
);