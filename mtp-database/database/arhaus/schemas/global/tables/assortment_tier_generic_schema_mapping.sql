--liquibase formatted sql
--changeset ashish@impactanalytics.co:assortment_tier_generic_schema_mapping stripComments:false splitStatements:false context:Release_2 labels:pk_mandatory
--comment: initial changeset for assortment_tier_generic_schema_mapping

CREATE TABLE global."assortment_tier_generic_schema_mapping" (LIKE global.product_generic_schema_mapping INCLUDING ALL);
	