--liquibase formatted sql
--changeset abhishek.sagar@impactanalytics.co:new_store_mapping_raw_figs runOnChange:true stripComments:false splitStatements:false context:MTP-58080 labels:MTP-58080
--comment: initial changeset for new_store_mapping
--rollback: SELECT 1
DROP VIEW IF EXISTS inventory_smart.new_store_mapping_raw;
CREATE OR REPLACE VIEW inventory_smart.new_store_mapping_raw 
AS
with base as (
SELECT
  n.store_code,
  n.sister_store_code,
  l0.val AS l0_name,
  l1.val AS l1_name,
  l2.val AS l2_name,
  l3.val AS l3_name,
  n.multiplier AS multipler
FROM global.new_store_mapping AS n

LEFT JOIN LATERAL (
  SELECT jsonb_array_elements_text(e.elem->'values') AS val
  FROM jsonb_array_elements(COALESCE(n.hierarchies, '[]'::jsonb)) AS e(elem)
  WHERE e.elem->>'attribute_name' = 'l0_name'
) l0 ON TRUE

LEFT JOIN LATERAL (
  SELECT jsonb_array_elements_text(e.elem->'values') AS val
  FROM jsonb_array_elements(COALESCE(n.hierarchies, '[]'::jsonb)) AS e(elem)
  WHERE e.elem->>'attribute_name' = 'l1_name'
) l1 ON TRUE

LEFT JOIN LATERAL (
  SELECT jsonb_array_elements_text(e.elem->'values') AS val
  FROM jsonb_array_elements(COALESCE(n.hierarchies, '[]'::jsonb)) AS e(elem)
  WHERE e.elem->>'attribute_name' = 'l2_name'
) l2 ON TRUE

LEFT JOIN LATERAL (
  SELECT jsonb_array_elements_text(e.elem->'values') AS val
  FROM jsonb_array_elements(COALESCE(n.hierarchies, '[]'::jsonb)) AS e(elem)
  WHERE e.elem->>'attribute_name' = 'l3_name'
) l3 ON TRUE

WHERE
  (l1.val IS NULL OR l0.val IS NOT NULL) AND
  (l2.val IS NULL OR l1.val IS NOT NULL) AND
  (l3.val IS NULL OR l2.val IS NOT NULL)
   and not is_deleted
 )
 
 select distinct base.* from base join global.product_attributes_filter paf
 on concat(paf.l0_name,paf.l1_name,paf.l2_name,paf.l3_name) =  concat(base.l0_name,base.l1_name,base.l2_name,base.l3_name)
 ;