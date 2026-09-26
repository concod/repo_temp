--liquibase formatted sql
--changeset liquibase:product_store_hierarchy_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_store_hierarchy_mapping

CREATE TABLE "global".product_store_hierarchy_mapping (
	l0_name varchar NULL,
	l1_name varchar NULL,
	l2_name varchar NULL,
	channel varchar NULL
);


--changeset liquibase:add_composite_key_to_product_store_hierarchy_mapping stripComments:false context:Release_1_0 labels:liquibase_project_start
--comment: adding composite primary key to product_store_hierarchy_mapping

ALTER TABLE "global".product_store_hierarchy_mapping
ADD CONSTRAINT pk_product_store_hierarchy
PRIMARY KEY (l0_name, l1_name, l2_name);

--changeset aiyush.prasad@impactanalytics.co:product_store_hierarchy_mapping additional columns stripComments:false splitStatements:false context:RELEASE_1_0_0 labels: additional columns
--comment adding extra columns 

ALTER TABLE "global".product_store_hierarchy_mapping ADD COLUMN s0_name varchar NULL;
ALTER TABLE "global".product_store_hierarchy_mapping ADD COLUMN s1_name varchar NULL;
