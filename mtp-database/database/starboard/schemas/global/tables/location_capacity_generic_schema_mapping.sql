--liquibase formatted sql
--changeset ashvin.prasanth@impactanalytics.co:location_capacity_generic_schema_mapping stripComments:false splitStatements:false context:Release_2 labels:pk_mandatory
--comment: initial changeset for location_capacity_generic_schema_mapping

CREATE TABLE global."location_capacity_generic_schema_mapping" (LIKE global.product_generic_schema_mapping INCLUDING ALL);
	