--liquibase formatted sql
--changeset krithika.s@impactanalytics.co:bp_store_hierarchy_level_v2 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_store_hierarchy_level_v2


CREATE TABLE base_pricing.bp_store_hierarchy_level (
	store_hierarchy_level_id int2 NOT NULL,
	store_hierarchy_level_value varchar NULL,
	price_change_driver bool NULL,
	store_hierarchy_level_label varchar NULL,
	current_cpi bool NULL,
	CONSTRAINT bp_store_hierarchy_level_pkey PRIMARY KEY (store_hierarchy_level_id)
);