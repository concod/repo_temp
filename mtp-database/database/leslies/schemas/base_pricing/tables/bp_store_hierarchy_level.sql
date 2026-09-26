--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_store_hierarchy_level_10 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_store_hierarchy_level_10

CREATE TABLE base_pricing.bp_store_hierarchy_level (
	store_hierarchy_level_id int2 NOT NULL,
	store_hierarchy_level_value varchar(50) NULL,
	is_cascading bool DEFAULT true NULL,
	store_hierarchy_level_label varchar NULL,
	report_hierarchy_dropdown bool NULL,
	CONSTRAINT bp_store_hierarchy_level_pkey PRIMARY KEY (store_hierarchy_level_id)
);