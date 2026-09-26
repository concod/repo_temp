--liquibase formatted sql
--changeset swapnil.bhange:product_store_hierarchy_mapping stripComments:false splitStatements:false context:Release_1_0 labels:002
--comment: initial changeset for product_store_hierarchy_mapping

CREATE TABLE global.product_store_hierarchy_mapping (
	l0_name varchar NULL,
	l1_name varchar NULL,
	l3_name varchar NULL,
	l4_name varchar NULL,
	psa_name int4 NULL
);
--changeset linu.nazil:product_store_hierarchy_mapping_v1 stripComments:false splitStatements:false context:Release_1_0 labels:002
--comment: modified changeset for product_store_hierarchy_mapping_v1
ALTER TABLE "global".product_store_hierarchy_mapping ALTER COLUMN psa_name TYPE varchar USING psa_name::varchar;

--changeset swapnil-bhange:product_store_hierarchy_mapping_v2 stripComments:false splitStatements:false context:Release_1_0 labels:003
--comment: added l0_status and allocation_status_flag column in product_store_hierarchy_mapping
ALTER TABLE "global".product_store_hierarchy_mapping ADD COLUMN l0_status varchar;
ALTER TABLE "global".product_store_hierarchy_mapping ADD COLUMN allocation_status_flag boolean;


--changeset ashish@impactanalytics.co:product_store_hierarchy_mapping_pk stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_store_hierarchy_mapping_pk
ALTER TABLE global.product_store_hierarchy_mapping ADD COLUMN id serial4 PRIMARY KEY;
