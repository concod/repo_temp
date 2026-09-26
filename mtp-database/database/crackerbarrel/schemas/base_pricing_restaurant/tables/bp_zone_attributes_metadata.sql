--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_zone_attributes_metadata stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_zone_attributes_metadata

CREATE TABLE base_pricing_restaurant.bp_zone_attributes_metadata (
	attribute_id serial4 NOT NULL,
	product_hierarchy_level int4 NULL,
	suffix int4 NULL,
	attribute_name varchar(100) NULL,
	frontend_display_name varchar(100) NULL,
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
	pinned_side varchar NULL,
	is_active bool DEFAULT true NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	is_filterable bool DEFAULT false NOT NULL,
	extra_params jsonb DEFAULT '[]'::jsonb NULL,
	CONSTRAINT bp_zone_attributes_metadata_pinned_side_check CHECK (((pinned_side)::text = ANY (ARRAY[('left'::character varying)::text, ('right'::character varying)::text]))),
	CONSTRAINT bp_zone_attributes_metadata_pkey PRIMARY KEY (attribute_id),
	CONSTRAINT bp_zone_attributes_metadata_product_hierarchy_suffix_key UNIQUE (product_hierarchy_level, suffix),
	CONSTRAINT fk_zone_attr_suffix FOREIGN KEY (suffix) REFERENCES base_pricing_restaurant.bp_suffixes_metadata(suffix_id)
);