--liquibase formatted sql
--changeset subhash.pophale@impactanalytics.co:product_hierarchies_filter runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-89707
--comment: Active column added
--rollback: SELECT 1
DROP VIEW IF EXISTS plan_smart.product_hierarchies_filter CASCADE;
-- plan_smart.product_hierarchies_filter source

CREATE OR REPLACE VIEW plan_smart.product_hierarchies_filter
AS WITH phf_level1_to_level6 AS (
         SELECT phf.hierarchy_code,
            (phf.path ->> 'l0_name'::text)::character varying AS l0_name,
            (phf.path ->> 'l1_name'::text)::character varying AS l1_name,
            (phf.path ->> 'l2_name'::text)::character varying AS l2_name,
            (phf.path ->> 'l3_name'::text)::character varying AS l3_name,
            (phf.path ->> 'product_code'::text)::character varying AS product_code,
            phf.level,
            phf.active
           FROM global.product_hierarchies_filter phf
          WHERE phf.active = true AND (phf.level = ANY (ARRAY[1, 2, 3, 5, 6]))
        ), phf_level4 AS (
         SELECT phf.hierarchy_code,
            (phf.path ->> 'l0_name'::text)::character varying AS l0_name,
            (phf.path ->> 'l1_name'::text)::character varying AS l1_name,
            (phf.path ->> 'l2_name'::text)::character varying AS l2_name,
            (phf.path ->> 'l3_name'::text)::character varying AS l3_name,
            (phf.path ->> 'product_code'::text)::character varying AS product_code,
            phf.level,
            phf.active
           FROM global.product_hierarchies_filter phf
          WHERE phf.active = true AND phf.level = 4
        )
 SELECT DISTINCT phf.hierarchy_code,
    phf.l0_name,
    phf.l1_name,
    phf.l2_name,
    phf.l3_name,
    phf.product_code,
    phf.level,
    phf.active
   FROM phf_level4 phf
     JOIN global.product_attributes_filter paf ON phf.l0_name::text = paf.l0_name::text AND phf.l1_name::text = paf.l1_name::text AND phf.l2_name::text = paf.l2_name::text AND phf.l3_name::text = paf.l3_name::text AND paf.active
UNION ALL
 SELECT phf_level1_to_level6.hierarchy_code,
    phf_level1_to_level6.l0_name,
    phf_level1_to_level6.l1_name,
    phf_level1_to_level6.l2_name,
    phf_level1_to_level6.l3_name,
    phf_level1_to_level6.product_code,
    phf_level1_to_level6.level,
    phf_level1_to_level6.active
   FROM phf_level1_to_level6;
   