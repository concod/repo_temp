--liquibase formatted sql
--changeset ashish@impactanalytics.co:markdown_generic_schema_mapping stripComments:false splitStatements:false context:Release_2 labels:pk_mandatory
--comment: initial changeset for markdown_generic_schema_mapping

CREATE TABLE global."markdown_generic_schema_mapping" (LIKE global.product_generic_schema_mapping INCLUDING ALL);
	