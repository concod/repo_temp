--liquibase formatted sql
--changeset ashish@impactanalytics.co:loss_units_generic_schema_mapping stripComments:false splitStatements:false context:Release_2 labels:pk_mandatory
--comment: initial changeset for loss_units_generic_schema_mapping

CREATE TABLE global."loss_units_generic_schema_mapping" (LIKE global.product_generic_schema_mapping INCLUDING ALL);
	