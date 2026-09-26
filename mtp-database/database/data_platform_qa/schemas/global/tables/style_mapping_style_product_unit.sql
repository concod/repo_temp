--liquibase formatted sql
--changeset liquibase:style_mapping_style_product_unit stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for style_mapping_style_product_unit
CREATE TABLE global.style_mapping_style_product_unit (
    mapping_type character varying NOT NULL,
    style character varying,
    pud_code integer,
    CONSTRAINT style_product_unit_mapping_not_null CHECK (((style IS NOT NULL) AND (pud_code IS NOT NULL)))
);
ALTER TABLE global.style_mapping ATTACH PARTITION global.style_mapping_style_product_unit FOR VALUES IN ('style_product_unit_mapping');
ALTER TABLE global.style_mapping_style_product_unit
    ADD CONSTRAINT style_product_unit_mapping_un UNIQUE (style, pud_code);
