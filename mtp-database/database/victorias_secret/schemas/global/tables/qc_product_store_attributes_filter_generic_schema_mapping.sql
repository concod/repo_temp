--liquibase formatted sql
--changeset ashish@impactanalytics.co:qc_product_store_attributes_filter_generic_schema_mapping stripComments:false splitStatements:false context:Release_2 labels:pk_mandatory
--comment: initial changeset for qc_product_store_attributes_filter_generic_schema_mapping

CREATE TABLE global."qc_product_store_attributes_filter_generic_schema_mapping" (LIKE global.product_generic_schema_mapping INCLUDING ALL);
	