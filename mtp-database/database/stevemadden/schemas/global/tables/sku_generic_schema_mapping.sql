--liquibase formatted sql
--changeset ashish@impactanalytics.co:sku_generic_schema_mapping stripComments:false splitStatements:false context:Release_2 labels:pk_mandatory
--comment: initial changeset for sku_generic_schema_mapping

CREATE TABLE global."sku_generic_schema_mapping" (LIKE global.product_generic_schema_mapping INCLUDING ALL);
	