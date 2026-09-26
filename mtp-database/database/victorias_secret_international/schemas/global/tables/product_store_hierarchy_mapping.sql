--liquibase formatted sql
--changeset kanishka.parashar@impactanalytics.co::product_store_hierarchy_mapping_v2 stripComments:false splitStatements:false context:Release_1_0 labels
--comment: product_store_hierarchy_mapping update
CREATE TABLE IF NOT EXISTS "global".product_store_hierarchy_mapping (
	l0_name varchar(50) NOT NULL,
	l3_name varchar(50) NOT NULL,
	channel varchar(50) NOT NULL,
	CONSTRAINT product_store_hierarchy_mapping_un UNIQUE (l0_name, l3_name, channel)
);

--changeset harshitha.sv@impactanalytics.co:product_store_hierarchy_mapping_pk stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_store_hierarchy_mapping_pk
ALTER TABLE global.product_store_hierarchy_mapping ADD COLUMN id serial4 PRIMARY KEY;
