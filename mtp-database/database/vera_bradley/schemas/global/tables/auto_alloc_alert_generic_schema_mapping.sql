--liquibase formatted sql
--changeset ashish@impactanalytics.co:auto_alloc_alert_generic_schema_mapping stripComments:false splitStatements:false context:Release_2 labels:pk_mandatory
--comment: initial changeset for auto_alloc_alert_generic_schema_mapping

CREATE TABLE global."auto_alloc_alert_generic_schema_mapping" (LIKE global.product_generic_schema_mapping INCLUDING ALL);
	