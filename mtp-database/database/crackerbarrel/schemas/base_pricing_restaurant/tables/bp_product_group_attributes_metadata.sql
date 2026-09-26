--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_product_group_attributes_metadata stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_product_group_attributes_metadata

CREATE TABLE base_pricing_restaurant.bp_product_group_attributes_metadata (
	attribute_id int4 NOT NULL,
	attribute_name varchar NOT NULL,
	frontend_display_name varchar NOT NULL,
	data_type varchar NOT NULL,
	input_type varchar NULL,
	cell_render_type varchar NULL,
	input_values jsonb NULL,
	input_validation_ids _int4 NOT NULL,
	default_visibility bool NOT NULL,
	is_static bool NOT NULL,
	is_dynamic bool NOT NULL,
	is_editable_from_app bool NOT NULL,
	is_editable_from_file bool NOT NULL,
	is_resettable bool NOT NULL,
	pinned_side varchar NULL,
	is_active bool NOT NULL,
	created_at timestamp NOT NULL,
	updated_at timestamp NOT NULL,
	is_filterable bool NOT NULL,
	extra_params jsonb NULL
);