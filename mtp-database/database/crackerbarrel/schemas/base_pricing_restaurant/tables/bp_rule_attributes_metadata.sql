--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_rule_attributes_metadata stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_rule_attributes_metadata

CREATE TABLE base_pricing_restaurant.bp_rule_attributes_metadata (
	attribute_id int4 NOT NULL,
	rule_id int4 NOT NULL,
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
	CONSTRAINT bp_rule_attributes_metadata_pkey PRIMARY KEY (attribute_id),
	CONSTRAINT bp_rule_attributes_metadata_rule_id_value UNIQUE (rule_id)
);


--changeset abhishek.singh@impactanalytics.co:bp_rule_attributes_metadata_10 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_rule_attributes_metadata_10

ALTER table base_pricing_restaurant.bp_rule_attributes_metadata
ADD COLUMN is_value_preserved boolean DEFAULT true NOT NULL;