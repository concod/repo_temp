--liquibase formatted sql
--changeset manas.malik@impactanalytics.co:plan_generic_schema_mapping_1 stripComments:false splitStatements:false context:Release_1.1 labels:plan_generic_schema_mapping
--comment: changeset for plan_generic_schema_mapping

CREATE TABLE global."plan_generic_schema_mapping" (LIKE global.product_generic_schema_mapping INCLUDING ALL);
