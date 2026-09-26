--liquibase formatted sql
--changeset kamuju.mahaveer:sku_dc_reserved_units_v3 runOnChange:true stripComments:false splitStatements:false context:VS-290 labels:liquibase_project_start
--comment: Added dc-to-dc transfer reserve to reserve
--rollback: SELECT 1
DROP VIEW IF EXISTS inventory_smart.sku_dc_reserved_units;
CREATE OR REPLACE VIEW inventory_smart.sku_dc_reserved_units
AS SELECT paf.l0_name,
    pmpd.product_code,
    pmpd.product_code as pack_type_id,
    paf.article,
    paf.size,
    pmpd.dc_code,
    drq.type,
    drq.channel,
    sum(drq.quantity) AS quantity,
    1 AS units_in_pack
   FROM inventory_smart.dc_reserve_quantity drq
     JOIN global.product_mapping_product_dc pmpd USING (product_code, dc_code)
     JOIN global.product_attributes_filter paf USING (product_code)
  GROUP BY paf.l0_name,pmpd.product_code, paf.article, paf.size, pmpd.dc_code, drq.type, drq.channel
  UNION DISTINCT
  SELECT 
  paf.l0_name ,
  paf.product_code,
  paf.product_code as pack_type_id,
  paf.article,
  paf.size,
  source_dc AS dc_code,
  'D' as "type",
  saf.channel ,
  transfer_units as quantity,
  1 AS units_in_pack
  FROM inventory_smart.dc_review_recommendation_updated drru
  join "global".product_attributes_filter paf using(product_code)
  join "global".distribution_centres dc on drru.source_dc = dc.dc_code 
  join "global".store_attributes_filter saf on dc.linked_store_code = saf.store_code 
  WHERE drru.status_code = 3 AND (drru.updated_at at TIME zone 'America/New_York'::text) >= (now() at TIME zone 'America/New_York'::text) - interval '1 DAY'
  
  UNION DISTINCT
  
  SELECT paf.l0_name,
    nsr.product_code,
    nsr.product_code as pack_type_id,
    paf.article,
    paf.size,
    dc.dc_code::int4 as dc_code,
        CASE
            WHEN nsa.remodel_flag = true THEN 'R'::character varying
            ELSE 'N'::character varying
        END AS type,
    'Retail'::text AS channel,
    COALESCE(sum(GREATEST(COALESCE(nsr.approved_qty, 0), COALESCE(nsr.past_releases, 0)) - COALESCE(nsr.past_releases_yest, 0)), 0)::int4 AS quantity,
    1::int4 AS units_in_pack
   FROM global.new_store_reserve nsr
     JOIN global.new_store_attributes nsa ON nsa.store_code::text = nsr.store_code::text
     JOIN global.product_attributes_filter paf ON nsr.product_code::text = paf.product_code::text
     JOIN global.distribution_centres dc ON dc.linked_store_code::text =
        CASE
            WHEN upper(paf.l0_id::text) LIKE '%VSB%'::text THEN 'S003'::text
            ELSE 'S015'::text
        END
  WHERE nsr.approved = true AND nsa.opening_date > CURRENT_DATE AND nsr.is_deleted = false
  GROUP BY paf.l0_name, nsr.product_code, paf.article, paf.size, dc.dc_code, nsa.remodel_flag 
  ;