--liquibase formatted sql
--changeset ashvin.prasanth@impactanalytics.co:locationstoragecapacity_generic_schema_mapping stripComments:false splitStatements:false context:Release_2 labels:pk_mandatory
--comment: initial changeset for locationstoragecapacity_generic_schema_mapping

CREATE TABLE global."locationstoragecapacity_generic_schema_mapping" (LIKE global.product_generic_schema_mapping INCLUDING ALL);
	