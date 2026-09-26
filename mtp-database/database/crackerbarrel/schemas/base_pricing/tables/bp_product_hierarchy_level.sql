--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_product_hierarchy_level stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_product_hierarchy_level

CREATE TABLE base_pricing.bp_product_hierarchy_level (
	product_hierarchy_level_id int2 NOT NULL,
	product_hierarchy_level_value varchar NULL,
	is_cascading bool DEFAULT true NULL,
	product_hierarchy_level_label varchar NULL,
	report_hierarchy_dropdown bool NULL,
	is_competitor_mapping_view_by bool DEFAULT false NULL,
	is_strategy_step4_view_by bool DEFAULT false NULL,
	is_zone_mapping_view_by bool DEFAULT false NULL,
	CONSTRAINT bp_product_hierarchy_level_pkey PRIMARY KEY (product_hierarchy_level_id)
);