--liquibase formatted sql
--changeset liquibase:product_store_hierarchy_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_store_hierarchy_mapping

CREATE TABLE "global".product_store_hierarchy_mapping (
	l0_name varchar NULL,
	l1_name varchar NULL,
	l2_name varchar NULL,
	primary_trait_desc varchar null,
	l3_name varchar NULL,
	product_channel_name varchar NULL,
	store_channel_description varchar NULL,
	channel varchar NULL,
	country varchar NULL
);
--changeset laraib@impactanalytics.co:product_store_hierarchy_mapping_pk stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_store_hierarchy_mapping_pk
ALTER TABLE global.product_store_hierarchy_mapping ADD COLUMN id serial4 PRIMARY KEY;

--changeset aman.lakkoju:dropping_primary_trait_desc stripComments:false splitStatements:false context:Release_1_0 labels:dropping_primary_trait_desc
--comment: dropping_primary_trait_desc
ALTER TABLE global.product_store_hierarchy_mapping
DROP COLUMN IF EXISTS primary_trait_desc;