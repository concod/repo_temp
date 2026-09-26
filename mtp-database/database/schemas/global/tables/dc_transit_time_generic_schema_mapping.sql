--liquibase formatted sql
--changeset ashish@impactanalytics.co:dc_transit_time_generic_schema_mapping stripComments:false splitStatements:false context:Release_2 labels:pk_mandatory
--comment: initial changeset for dc_transit_time_generic_schema_mapping

CREATE TABLE global."dc_transit_time_generic_schema_mapping" (LIKE global.product_generic_schema_mapping INCLUDING ALL);
	