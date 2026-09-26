--liquibase formatted sql
--changeset ashish@impactanalytics.co:sse_grading_generic_schema_mapping stripComments:false splitStatements:false context:Release_2 labels:pk_mandatory
--comment: initial changeset for sse_grading_generic_schema_mapping

CREATE TABLE global."sse_grading_delta_generic_schema_mapping" (LIKE global.product_generic_schema_mapping INCLUDING ALL);
