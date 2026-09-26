--liquibase formatted sql
--changeset mayank.bhardwaj@impactanalytics.co :assort_smart.product_hierarchy_config stripComments:false splitStatements:false context:MTP-70241 labels:create_table
--comment: initial changeset for product_hierarchy_config

CREATE TABLE assort_smart.product_hierarchy_config (
	id serial4 NOT NULL,
	levels jsonb NOT NULL,
	store_levels jsonb NOT NULL,
	season_code varchar NULL,
	planning_path _varchar NULL,
	optimization_threshold varchar NULL,
	starting_level _varchar NULL,
	optimization_level _varchar NULL,
	final_level _varchar NULL,
	CONSTRAINT product_hierarchy_config_pkey PRIMARY KEY (id),
	CONSTRAINT product_hierarchy_config_unique_key UNIQUE (levels, store_levels, season_code)
);