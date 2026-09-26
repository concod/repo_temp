--liquibase formatted sql
--changeset sri.harsha@impactanalytics.co:liquibase_start stripComments:false splitStatements:false context:Release_1_0 labels:mtp-20764
--comment: initial changeset for product_store_hierarchy_mapping for signet
CREATE TABLE "global".product_store_hierarchy_mapping (
	market varchar NULL,
	country varchar NULL,
	l0_name varchar NULL,
	l1_name varchar NULL,
	channel varchar NULL
);

--changeset sri.harsha@impactanalytics.co:adding_l2_name stripComments:false splitStatements:false context:Release_1_0 labels:mtp-20764
--comment: adding the l2_name column in the pshm

alter table "global".product_store_hierarchy_mapping 
add column l2_name varchar;

--changeset ashish@impactanalytics.co:product_store_hierarchy_mapping_pk stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_store_hierarchy_mapping_pk
ALTER TABLE global.product_store_hierarchy_mapping ADD COLUMN id serial4 PRIMARY KEY;
