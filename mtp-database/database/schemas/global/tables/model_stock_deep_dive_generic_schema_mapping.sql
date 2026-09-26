--liquibase formatted sql
--changeset ashish@impactanalytics.co:model_stock_deep_dive_generic_schema_mapping stripComments:false splitStatements:false context:Release_2 labels:pk_mandatory
--comment: initial changeset for model_stock_deep_dive_generic_schema_mapping

CREATE TABLE global."model_stock_deep_dive_generic_schema_mapping" (LIKE global.product_generic_schema_mapping INCLUDING ALL);
	