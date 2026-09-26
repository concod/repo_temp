
--liquibase formatted sql

--changeset mayank.mukundam@impactanalytics.co:product_store_hierarchy_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_store_hierarchy_mapping
DROP TABLE IF EXISTS "global".product_store_hierarchy_mapping;

CREATE TABLE "global".product_store_hierarchy_mapping (
	l0_name varchar NULL,
	l1_name varchar NULL,
	l2_name varchar NULL,
	l3_name varchar NULL,
	product_channel_name varchar NULL,
	store_channel_description varchar NULL,
	channel varchar NULL,
	country varchar NULL,
	phsm_id serial4 NOT NULL,
	l4_name varchar NULL,
	CONSTRAINT product_store_hierarchy_mapping_pkey PRIMARY KEY (phsm_id)
);