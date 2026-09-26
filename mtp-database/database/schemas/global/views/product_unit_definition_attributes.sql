--liquibase formatted sql
--changeset liquibase:product_unit_definition_attributes runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_unit_definition_attributes
--rollback: SELECT 1
DROP VIEW IF EXISTS "global".product_unit_definition_attributes;
CREATE OR REPLACE VIEW "global".product_unit_definition_attributes
AS SELECT product_unit_definitions.pud_code,
    'name'::text AS attribute_name,
    product_unit_definitions.name AS attribute_value
   FROM global.product_unit_definitions
UNION ALL
 SELECT product_unit_definitions.pud_code,
    'definition_type'::text AS attribute_name,
    product_unit_definitions.definition_type AS attribute_value
   FROM global.product_unit_definitions;
