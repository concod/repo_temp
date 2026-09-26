--liquibase formatted sql
--changeset sreevathsa.sp@impactanalytics.co:product_store_hierarchy_mapping stripComments:false splitStatements:false context:Release_1_0 labels:briscoes_product_store_hierarchy_mapping
--comment: initial changeset for product_store_hierarchy_mapping

CREATE TABLE IF NOT EXISTS "global".product_store_hierarchy_mapping (
	l0_name varchar NULL,
	l1_name varchar NULL,
	product_channel_name varchar NULL,
	store_channel_description varchar NULL,
	channel varchar NULL,
    s0_name varchar NULL,
	country varchar NULL
);

--changeset ashish@impactanalytics.co:product_store_hierarchy_mapping_pk stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_store_hierarchy_mapping_pk
ALTER TABLE global.product_store_hierarchy_mapping ADD COLUMN id serial4 PRIMARY KEY;

-- changeset bhaskar.reddy@impactanalytics.co:product_store_hierarchy_mapping_add_l2_name,l3_id_name,brand stripComments:false splitStatements:false context:TP-64270_1 labels:product_store_hierarchy_mapping_add_l2_name,l3_id_name,brand
-- comment: add_l2_name,l3_id_name,brand columns
ALTER TABLE "global".product_store_hierarchy_mapping ADD COLUMN IF NOT EXISTS l2_name varchar NULL;
ALTER TABLE "global".product_store_hierarchy_mapping ADD COLUMN IF NOT EXISTS l3_id_name varchar NULL;
ALTER TABLE "global".product_store_hierarchy_mapping ADD COLUMN IF NOT EXISTS brand varchar NULL;