--liquibase formatted sql
--changeset liquibase:product_store_hierarchy_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: product_store_hierarchy_mapping


CREATE TABLE "global".product_store_hierarchy_mapping (
	mapping_key int4 NOT NULL,
	l0_name varchar NULL,
	l1_name varchar NULL,
	l2_name varchar NULL,
	business_unit varchar NULL,
	group_id varchar NULL,
	channel varchar NULL,
    s1_name varchar NULL,
	CONSTRAINT product_store_hierarchy_mapping_pkey PRIMARY KEY (mapping_key)
);

--changeset liquibase:product_store_hierarchy_mapping_new stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: product_store_hierarchy_mapping adding columns


ALTER TABLE "global".product_store_hierarchy_mapping 
ADD COLUMN l3_name varchar NULL,
ADD COLUMN l4_name varchar NULL;