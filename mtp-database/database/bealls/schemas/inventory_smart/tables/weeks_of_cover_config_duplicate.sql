--liquibase formatted sql
--changeset ujjawal.singh@impactanalytics.co:weeks_of_cover_config_duplicate stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: weeks_of_cover_config_duplicate for weeks of cover

CREATE TABLE IF NOT EXISTS inventory_smart.weeks_of_cover_config_duplicate (
	id serial4 NOT NULL,
	sku_id varchar(50) NOT NULL,
	weeks_of_cover int4 DEFAULT 8 NULL,
	max_modifier numeric(5, 2) DEFAULT 1.0 NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT weeks_of_cover_config_duplicate_pkey PRIMARY KEY (id),
	CONSTRAINT weeks_of_cover_config_duplicate_sku_id_key UNIQUE (sku_id)
);