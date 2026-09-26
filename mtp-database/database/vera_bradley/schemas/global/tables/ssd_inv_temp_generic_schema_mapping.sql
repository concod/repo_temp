--liquibase formatted sql
--changeset ashish@impactanalytics.co:ssd_inv_temp_generic_schema_mapping stripComments:false splitStatements:false context:Release_2 labels:pk_mandatory
--comment: initial changeset for ssd_inv_temp_generic_schema_mapping

CREATE TABLE global."ssd_inv_temp_generic_schema_mapping" (LIKE global.product_generic_schema_mapping INCLUDING ALL);
	