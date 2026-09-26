--liquibase formatted sql
--changeset ashish@impactanalytics.co:multi_level_bom_generic_schema_mapping stripComments:false splitStatements:false context:Release_2 labels:pk_mandatory
--comment: initial changeset for multi_level_bom_generic_schema_mapping

CREATE TABLE global."multi_level_bom_generic_schema_mapping" (LIKE global.product_generic_schema_mapping INCLUDING ALL);
	