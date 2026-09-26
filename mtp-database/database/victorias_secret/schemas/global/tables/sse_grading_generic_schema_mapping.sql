--liquibase formatted sql
--changeset ashish@impactanalytics.co:sse_grading_generic_schema_mapping stripComments:false splitStatements:false context:Release_2 labels:pk_mandatory
--comment: initial changeset for sse_grading_generic_schema_mapping

CREATE TABLE global."sse_grading_generic_schema_mapping" (LIKE global.product_generic_schema_mapping INCLUDING ALL);

--changeset shinde.samarth@impactanalytics.co:sse_grading_generic_schema_mapping_brand_flag_drop_v1 stripComments:false splitStatements:false context:Release_2 labels:VS-XXX
--comment: dropping brand_flag column from sse_grading_generic_schema_mapping
ALTER TABLE global.sse_grading_generic_schema_mapping DROP COLUMN IF EXISTS brand_flag;