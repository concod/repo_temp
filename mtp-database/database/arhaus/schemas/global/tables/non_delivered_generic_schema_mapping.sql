--liquibase formatted sql
--changeset ashish@impactanalytics.co:non_delivered_generic_schema_mapping stripComments:false splitStatements:false context:Release_2 labels:pk_mandatory
--comment: initial changeset for non_delivered_generic_schema_mapping

CREATE TABLE global."non_delivered_generic_schema_mapping" (LIKE global.product_generic_schema_mapping INCLUDING ALL);
	