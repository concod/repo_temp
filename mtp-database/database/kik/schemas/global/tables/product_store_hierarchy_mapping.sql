--liquibase formatted sql
--changeset srinivasgowda.sg@impactanalytics.co:product_store_hierarchy_mapping  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_store_hierarchy_mapping

CREATE TABLE "global".product_store_hierarchy_mapping (
	l0_name varchar NULL,
	l1_name varchar NULL,
	l2_name varchar NULL,
	channel varchar NULL,
	mapping_key text NULL
);

--changeset srinivasgowda.sg@impactanalytics.co:product_store_hierarchy_mapping_pk  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_store_hierarchy_mapping_pk
ALTER TABLE global.product_store_hierarchy_mapping
ADD CONSTRAINT product_store_hierarchy_mapping_pkey
PRIMARY KEY (channel, mapping_key, l2_name);