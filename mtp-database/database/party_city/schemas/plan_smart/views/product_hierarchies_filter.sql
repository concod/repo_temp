--liquibase formatted sql
--changeset subhash.pophale@impactanalytics.co:product_hierarchies_filter_chg2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-41228
--comment: Business Unit column added to view to create mapping of store dim to product hierarchy dim
--rollback: SELECT 1
DROP VIEW IF EXISTS plan_smart.product_hierarchies_filter;
CREATE OR REPLACE VIEW plan_smart.product_hierarchies_filter
AS SELECT phf.hierarchy_code,
    (phf.path ->> 'l0_name'::text)::character varying AS l0_name,
    (phf.path ->> 'l1_name'::text)::character varying AS l1_name,
    (phf.path ->> 'l2_name'::text)::character varying AS l2_name,
    (phf.path ->> 'l3_name'::text)::character varying AS l3_name,
    (phf.path ->> 'l4_name'::text)::character varying AS style,
    (phf.path ->> 'l5_name'::text)::character varying AS l5_name,
    (phf.path ->> 'article'::text)::character varying AS article,
    (phf.path ->> 'product_code'::text)::character varying AS product_code,
    phf.level,
    phf.active,
    paf.business_unit::text[] AS business_unit
   FROM global.product_hierarchies_filter phf
     LEFT JOIN global.mv_paf_bu_wise paf ON (((phf.path ->> 'l0_name'::text)::character varying)::text) = paf.l0_name::text AND (((phf.path ->> 'l1_name'::text)::character varying)::text) = paf.l1_name::text AND (((phf.path ->> 'l2_name'::text)::character varying)::text) = paf.l2_name::text AND (((phf.path ->> 'l3_name'::text)::character varying)::text) = paf.l3_name::text
  WHERE phf.active = true;