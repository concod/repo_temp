--liquibase formatted sql
--changeset ashvin.prasanth@impactanalytics.co:voyageshipment_generic_schema_mapping stripComments:false splitStatements:false context:Release_2 labels:pk_mandatory
--comment: initial changeset for voyageshipment_generic_schema_mapping

CREATE TABLE global."voyageshipment_generic_schema_mapping" (LIKE global.product_generic_schema_mapping INCLUDING ALL);
	