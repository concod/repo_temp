--liquibase formatted sql
--changeset sriraj.avaranasi@impactanalytics.co:product_store_hierarchy_mapping stripComments:false splitStatements:false context:Release_1_0 labels:briscoes_product_store_hierarchy_mapping
--comment: initial changeset for product_store_hierarchy_mapping

CREATE TABLE IF NOT EXISTS "global".product_store_hierarchy_mapping (
	l0_name varchar NULL,
	l1_name varchar NULL,
	l2_name varchar NULL,
	l3_name varchar NULL,
	product_channel_name varchar NULL,
	store_channel_description varchar NULL,
	channel varchar NULL,
	country varchar NULL
);

--changeset navin.chandan@impactanalytics.co:column_chjange stripComments:false splitStatements:false context:Release_1_0 labels:MTP-67924
--comment: columns update for product_store_hierarchy_mapping
ALTER TABLE "global".product_store_hierarchy_mapping DROP COLUMN country;
ALTER TABLE "global".product_store_hierarchy_mapping ADD COLUMN sales_org_name varchar;


--changeset ashish@impactanalytics.co:product_store_hierarchy_mapping_pk stripComments:false splitStatements:false context:RELEASE_1_0_0 labels:JIRA_NO 
--comment adding new table 
ALTER TABLE global.product_store_hierarchy_mapping ADD COLUMN id serial4 PRIMARY KEY;
