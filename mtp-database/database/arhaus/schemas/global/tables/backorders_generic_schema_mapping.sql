--liquibase formatted sql
--changeset ashish@impactanalytics.co:backorders_generic_schema_mapping stripComments:false splitStatements:false context:Release_2 labels:pk_mandatory
--comment: initial changeset for backorders_generic_schema_mapping

CREATE TABLE global."backorders_generic_schema_mapping" (LIKE global.product_generic_schema_mapping INCLUDING ALL);
	