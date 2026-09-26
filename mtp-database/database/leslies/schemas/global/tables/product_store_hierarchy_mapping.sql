--liquibase formatted sql
--changeset liquibase:product_store_hierarchy_mapping_v1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_store_hierarchy_mapping_v1

DROP TABLE IF EXISTS "global".product_store_hierarchy_mapping;
CREATE TABLE "global".product_store_hierarchy_mapping (
	l0_name varchar NULL,
	l1_name varchar NULL,
	l2_name varchar NULL,
	l3_name varchar NULL,
	channel varchar NULL,
	country varchar NULL,
	id serial4 NOT NULL,
	CONSTRAINT product_store_hierarchy_mapping_pkey PRIMARY KEY (id)
);