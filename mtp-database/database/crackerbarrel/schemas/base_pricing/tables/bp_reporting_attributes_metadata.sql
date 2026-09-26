--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_reporting_attributes_metadata stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_reporting_attributes_metadata

CREATE TABLE base_pricing.bp_reporting_attributes_metadata (
	attribute_id int4 NOT NULL,
	attribute_name varchar(100) NOT NULL,
	frontend_display_name varchar(100) NOT NULL,
	data_type varchar(50) NOT NULL,
	input_type varchar(50) NULL,
	cell_render_type varchar(50) NULL,
	input_values jsonb NULL,
	input_validation_ids _int4 DEFAULT '{}'::integer[] NOT NULL,
	default_visibility bool DEFAULT false NOT NULL,
	is_static bool DEFAULT false NOT NULL,
	is_dynamic bool DEFAULT false NOT NULL,
	is_editable_from_app bool DEFAULT true NOT NULL,
	is_editable_from_file bool DEFAULT true NOT NULL,
	is_resettable bool DEFAULT false NOT NULL,
	is_active bool DEFAULT true NOT NULL,
	is_filterable bool DEFAULT false NOT NULL,
	extra_params jsonb DEFAULT '[]'::jsonb NULL,
	cell_render_params jsonb DEFAULT '[]'::jsonb NULL,
	column_data_format varchar NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	depends_on varchar NULL,
	comparison_attributes _varchar DEFAULT '{}'::character varying(50)[] NULL,
	rule_types jsonb DEFAULT '[]'::jsonb NULL,
	column_order int2 NULL,
	product_store_impacted_attributes _varchar DEFAULT '{}'::character varying[] NOT NULL,
	report_display_name varchar(100) NULL,
	attribute_update_level varchar NULL,
	database_column varchar(50) NULL,
	is_competitive_rule bool DEFAULT true NULL,
	CONSTRAINT bp_reporting_attributes_metadata_name_display_unique UNIQUE (attribute_name, frontend_display_name),
	CONSTRAINT bp_reporting_attributes_metadata_pkey PRIMARY KEY (attribute_id)
);

--changeset vishnu.vardhan@impactanalytics.co:bp_reporting_attributes_metadata_5 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: Add forecast_type column to bp_reporting_attributes_metadata
ALTER TABLE base_pricing.bp_reporting_attributes_metadata 
ADD COLUMN forecast_type VARCHAR(100) NULL;

--changeset vishnu.vardhan@impactanalytics.co:bp_reporting_attributes_metadata_6 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: Add is_value_preserved and forecast_kpi columns to bp_reporting_attributes_metadata
ALTER TABLE base_pricing.bp_reporting_attributes_metadata 
ADD COLUMN forecast_kpi VARCHAR(100) NULL;