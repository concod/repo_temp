--liquibase formatted sql
--changeset jagadeesh.pondara@impactanalytics.co::product_store_hierarchy_mapping stripComments:false splitStatements:false context:Release_1_0 labels
--comment: initial changeset for product_store_hierarchy_mapping for RL

CREATE TABLE "global".product_store_hierarchy_mapping (
	l0_name varchar(50) NOT NULL,
	l1_name varchar(50) NOT NULL,
	l2_name varchar(50) NOT NULL,
	channel varchar(50) NOT NULL,
	CONSTRAINT product_store_hierarchy_mapping_un UNIQUE (l0_name, l1_name, l2_name, channel)
);

--changeset vivek.subramanya@impactanalytics.co::product_store_hierarchy_mapping_limit_removal stripComments:false splitStatements:false context:Release_1_0 labels
--comment: product_store_hierarchy_mapping character limit removal

ALTER TABLE "global".product_store_hierarchy_mapping ALTER COLUMN l0_name TYPE varchar USING l0_name::varchar;
ALTER TABLE "global".product_store_hierarchy_mapping ALTER COLUMN l1_name TYPE varchar USING l1_name::varchar;
ALTER TABLE "global".product_store_hierarchy_mapping ALTER COLUMN l2_name TYPE varchar USING l2_name::varchar;
ALTER TABLE "global".product_store_hierarchy_mapping ALTER COLUMN channel TYPE varchar USING channel::varchar;


--changeset ashish@impactanalytics.co:product_store_hierarchy_mapping_pk stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_store_hierarchy_mapping_pk
ALTER TABLE global.product_store_hierarchy_mapping ADD COLUMN id serial4 PRIMARY KEY;
