--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_product_hierarchy_cid_mapping stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_product_hierarchy_cid_mapping

CREATE TABLE base_pricing_restaurant.bp_product_hierarchy_cid_mapping (
	hierarchy_level int4 NOT NULL,
	hierarchy_value int4 NOT NULL,
	hierarchy_name text NOT NULL,
	CONSTRAINT bp_product_hierarchy_cid_mapping_unique UNIQUE (hierarchy_level, hierarchy_value)
);