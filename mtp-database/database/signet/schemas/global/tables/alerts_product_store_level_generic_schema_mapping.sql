--liquibase formatted sql
--changeset liquibase:alerts_product_store_level_generic_schema_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for alerts_product_store_level_generic_schema_mapping
--rollback: SELECT 1

CREATE TABLE "global".alerts_product_store_level_generic_schema_mapping (
	attribute_name varchar(50) NULL,
	dimension varchar(50) NULL
);
