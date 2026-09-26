--liquibase formatted sql
--changeset liquibase:style_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for style_mapping
CREATE TABLE global.style_mapping (
    mapping_type character varying NOT NULL,
    style character varying,
    pud_code integer
)
PARTITION BY LIST (mapping_type);
ALTER TABLE global.style_mapping
    ADD CONSTRAINT style_mapping_product_unit_fk FOREIGN KEY (pud_code) REFERENCES global.product_unit_definitions(pud_code) ON DELETE CASCADE;
ALTER TABLE global.style_mapping
    ADD CONSTRAINT style_mapping_style_fk FOREIGN KEY (style) REFERENCES global.style_master(style_code) ON DELETE CASCADE;
