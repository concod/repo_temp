--liquibase formatted sql
--changeset rakesh.j@impactanalytics.co:plansmart_hierarchies_product runOnChange:true stripComments:false splitStatements:false context:zdt-views labels:MTP-1
--comment: initial changeset for plansmart_hierarchies_productt
--rollback: SELECT 1
Drop view if exists "global".plansmart_hierarchies_product; 
CREATE OR REPLACE VIEW "global".plansmart_hierarchies_product AS

WITH input_table AS (
SELECT DISTINCT
    '01' AS l0_id,
    'KIK Business' AS l0_name,
    l0_id AS l1_id,
    l0_id AS l1_name,
    l1_id AS l2_id,
    l1_id AS l2_name,
    l2_id AS l3_id,
    l2_id AS l3_name,
    l3_id AS l4_id,
    l3_id AS l4_name,
    season_code || '-' || season_code_desc AS l5_id,
    season_code || '-' || season_code_desc AS l5_name
FROM "global".product_attributes_filter
WHERE
    l0_id IS NOT NULL
    AND l1_id IS NOT NULL
    AND l2_id IS NOT NULL
    AND l3_id IS NOT NULL
    AND season_code IS NOT NULL
    AND season_code_desc IS NOT NULL
    AND product_status NOT IN (98,99)
)

SELECT
    l0_id,l0_name,
    l1_id,l1_name,
    l2_id,l2_name,
    l3_id,l3_name,
    l4_id,l4_name,
    l5_id,l5_name,
    6 AS level,
    TRUE AS active,
    'New' AS reclass_tag,
    ABS(hashtext(
        'LEVEL_6|' ||
        l0_id || '|' ||
        l1_id || '|' ||
        l2_id || '|' ||
        l3_id || '|' ||
        l4_id || '|' ||
        l5_id
    )) AS hierarchy_code
FROM input_table;