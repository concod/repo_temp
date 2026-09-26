
--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_product_hierarchy_cid_mapping_v2 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_product_hierarchy_cid_mapping_v2

CREATE TABLE base_pricing.bp_product_hierarchy_cid_mapping (
	hierarchy_level int4 NOT NULL,
	hierarchy_value int4 NOT NULL,
	hierarchy_name text NOT NULL,
	CONSTRAINT bp_product_hierarchy_cid_mapping_unique UNIQUE (hierarchy_level, hierarchy_value)
);