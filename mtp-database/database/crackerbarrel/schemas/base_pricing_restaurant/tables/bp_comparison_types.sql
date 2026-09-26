--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_comparison_types stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_comparison_types

-- DROP TABLE base_pricing_restaurant.bp_comparison_types;

CREATE TABLE base_pricing_restaurant.bp_comparison_types (
	id serial4 NOT NULL,
	static_id varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	parent_static_id varchar(255) NULL,
	"type" varchar(255) NOT NULL,
	placeholders jsonb NULL,
	placeholder_types varchar NULL,
	logic_operator varchar(255) NULL,
	is_range_check bool NULL,
	is_absolute_value bool NULL,
	is_active bool DEFAULT true NULL,
	CONSTRAINT bp_comparison_types_v2_pkey PRIMARY KEY (id),
	CONSTRAINT unique_static_id_v2 UNIQUE (static_id),
	CONSTRAINT bp_comparison_types_v2_parent_static_id_fkey FOREIGN KEY (parent_static_id) REFERENCES base_pricing_restaurant.bp_comparison_types(static_id) ON DELETE CASCADE
);