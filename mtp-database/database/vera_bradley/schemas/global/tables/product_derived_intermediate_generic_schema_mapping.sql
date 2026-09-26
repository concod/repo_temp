--liquibase formatted sql
--changeset ashish@impactanalytics.co:product_derived_intermediate_generic_schema_mapping stripComments:false splitStatements:false context:Release_2 labels:pk_mandatory
--comment: initial changeset for product_derived_intermediate_generic_schema_mapping

CREATE TABLE global."product_derived_intermediate_generic_schema_mapping" (LIKE global.product_generic_schema_mapping INCLUDING ALL);
	