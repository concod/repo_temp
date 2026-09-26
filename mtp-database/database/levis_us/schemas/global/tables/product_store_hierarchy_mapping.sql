--liquibase formatted sql
--changeset liquibase:product_store_hierarchy_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_store_hierarchy_mapping
CREATE TABLE "global".product_store_hierarchy_mapping (
	l0_name varchar NULL,
	l1_name varchar NULL,
	l2_name varchar NULL,
	l3_name varchar NULL,
	planning_group_name varchar NULL,
	country_id varchar NULL
);

--changeset ashish@impactanalytics.co:product_store_hierarchy_mapping_pk stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_store_hierarchy_mapping_pk
ALTER TABLE global.product_store_hierarchy_mapping ADD COLUMN id serial4 PRIMARY KEY;

--changeset himansh.bhardwaj:adding channel column stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding channel column to pshm
ALTER TABLE global.product_store_hierarchy_mapping 
ADD COLUMN IF NOT EXISTS channel VARCHAR NULL;
