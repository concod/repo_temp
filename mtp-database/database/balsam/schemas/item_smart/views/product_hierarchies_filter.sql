--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:product_hierarchies_filter runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-58202
--comment:  intial changest product_hierarchies_filter
--rollback: SELECT 1
DROP VIEW IF EXISTS item_smart.product_hierarchies_filter;
CREATE OR REPLACE VIEW item_smart.product_hierarchies_filter
AS SELECT product_hierarchies_filter.hierarchy_code,
    (product_hierarchies_filter.path ->> 'l0_name'::text)::character varying AS l0_name,
    (product_hierarchies_filter.path ->> 'l1_name'::text)::character varying AS l1_name,
    (product_hierarchies_filter.path ->> 'l2_name'::text)::character varying AS l2_name,
    (product_hierarchies_filter.path ->> 'l3_name'::text)::character varying AS l3_name,
    (product_hierarchies_filter.path ->> 'l4_name'::text)::character varying AS l4_name,
    (product_hierarchies_filter.path ->> 'l5_name'::text)::character varying AS l5_name,
    product_hierarchies_filter.level,
    product_hierarchies_filter.active
   FROM global.product_hierarchies_filter
     JOIN global.product_attributes_filter paf ON (product_hierarchies_filter.path ->> 'sku'::text) = paf.sku::text 
     AND (product_hierarchies_filter.path ->> 'l0_name'::text) = paf.l0_name::text
  WHERE product_hierarchies_filter.active = true AND product_hierarchies_filter.level = 7 AND paf.active = true
GROUP BY product_hierarchies_filter.hierarchy_code, ((product_hierarchies_filter.path ->> 'l0_name'::text)::character varying), ((product_hierarchies_filter.path ->> 'l1_name'::text)::character varying), ((product_hierarchies_filter.path ->> 'l2_name'::text)::character varying), ((product_hierarchies_filter.path ->> 'l3_name'::text)::character varying), ((product_hierarchies_filter.path ->> 'l4_name'::text)::character varying), ((product_hierarchies_filter.path ->> 'l5_name'::text)::character varying), ((product_hierarchies_filter.path ->> 'sku'::text)::character varying), product_hierarchies_filter.level, product_hierarchies_filter.active;
