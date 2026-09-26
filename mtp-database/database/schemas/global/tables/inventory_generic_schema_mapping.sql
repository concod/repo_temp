--liquibase formatted sql
--changeset ashish@impactanalytics.co:inventory_generic_schema_mapping stripComments:false splitStatements:false context:Release_2 labels:pk_mandatory
--comment: initial changeset for inventory_generic_schema_mapping

CREATE TABLE global."inventory_generic_schema_mapping" (LIKE global.product_generic_schema_mapping INCLUDING ALL);
	