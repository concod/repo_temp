--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_product_hierarchy_level_v3 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_product_hierarchy_level_v3

CREATE TABLE base_pricing.bp_product_hierarchy_level (
	product_hierarchy_level_id int2 NOT NULL,
	product_hierarchy_level_value varchar NULL,
	is_cascading bool DEFAULT true NULL,
	price_change_driver bool NULL,
	product_hierarchy_level_label varchar NULL,
	current_cpi bool NULL,
	CONSTRAINT bp_product_hierarchy_level_pkey PRIMARY KEY (product_hierarchy_level_id)
);