--liquibase formatted sql
--changeset krithika.s@impactanalytics.co:bp_rule_types_v1 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_rule_types_v1

CREATE TABLE base_pricing.bp_rule_types (
	id int4 NOT NULL,
	"name" varchar(255) NOT NULL,
	applicability_level_global varchar(255) NULL,
	applicability_level_global_2 varchar(255) NULL,
	applicability_level_targeted varchar(255) NULL,
	aggregate_level varchar(255) NULL,
	description varchar(255) NULL,
	rule_type varchar NOT NULL,
	rule_category varchar NOT NULL,
	comparison_type varchar NOT NULL,
	rule_type_order int4 NOT NULL,
	rule_attributes jsonb DEFAULT '{}'::jsonb NULL,
	flexibility_type varchar(255) NULL,
	is_enabled bool DEFAULT true NOT NULL,
	is_product_filter bool DEFAULT true NOT NULL,
	is_store_filter bool DEFAULT true NOT NULL,
	is_customer_segment_filter bool DEFAULT true NOT NULL,
	product_filter_template jsonb DEFAULT '{}'::jsonb NULL,
	store_filter_template jsonb DEFAULT '{}'::jsonb NULL,
	customer_segment_filter_template jsonb DEFAULT '{}'::jsonb NULL,
	aggregate_level_label varchar DEFAULT ''::character varying NOT NULL,
	is_rule_flexibility_editable bool DEFAULT true NOT NULL,
	is_syncing_editable bool DEFAULT true NOT NULL,
	is_added_to_strategy_editable bool DEFAULT true NOT NULL,
	is_edit_enabled bool DEFAULT true NOT NULL,
	is_delete_enabled bool DEFAULT true NOT NULL,
	is_product_filter_disabled bool DEFAULT false NOT NULL,
	is_store_filter_disabled bool DEFAULT false NOT NULL,
	is_customer_segment_filter_disabled bool DEFAULT false NOT NULL,
	CONSTRAINT bp_rule_types_pkey PRIMARY KEY (id),
	CONSTRAINT unique_rule_type UNIQUE (rule_type)
);