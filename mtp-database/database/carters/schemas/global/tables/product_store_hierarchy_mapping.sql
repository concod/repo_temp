--liquibase formatted sql
--changeset shameel.zeshan@impactanalytics.co:product_store_hierarchy_mapping stripComments:false splitStatements:false context: db_sync labels:product_store_hierarchy_mapping
--comment: initial changeset for product_store_hierarchy_mapping
CREATE TABLE "global".product_store_hierarchy_mapping (
	l0_name varchar NULL,
	l1_name varchar NULL,
	l2_name varchar NULL,
	l3_name varchar NULL,
	product_channel_name varchar NULL,
	store_channel_description varchar NULL,
	channel varchar NULL
);

--changeset shameel.zeeshan@impactanalytics.co:product_store_hierarchy_mapping stripComments:false splitStatements:false context: db_sync labels:country column addition 
--comment: country column addition 
ALTER TABLE global.product_store_hierarchy_mapping ADD COLUMN IF NOT EXISTS country varchar NULL; 

--changeset ashish@impactanalytics.co:product_store_hierarchy_mapping_pk stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_store_hierarchy_mapping_pk
ALTER TABLE global.product_store_hierarchy_mapping ADD COLUMN id serial4 PRIMARY KEY;
