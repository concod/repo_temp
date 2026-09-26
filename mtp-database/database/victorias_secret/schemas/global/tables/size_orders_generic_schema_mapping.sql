--liquibase formatted sql
--changeset ashish@impactanalytics.co:size_orders_generic_schema_mapping stripComments:false splitStatements:false context:Release_2 labels:pk_mandatory
--comment: initial changeset for size_orders_generic_schema_mapping

CREATE TABLE global."size_orders_generic_schema_mapping" (LIKE global.product_generic_schema_mapping INCLUDING ALL);
	