--liquibase formatted sql
--changeset adesh.kumar:sku_dc_available_units runOnChange:true stripComments:false splitStatements:false context:MTP-23981-fix-for-sku_dc_available_units labels:MTP-23981
--comment: MTP-23981-fix-for-sku_dc_available_units
--rollback: SELECT 1
DROP VIEW IF EXISTS inventory_smart.sku_dc_available_units;
CREATE OR REPLACE VIEW inventory_smart.sku_dc_available_units
AS SELECT paf.article,
    paf.product_code,
    paf.size AS pack_type_id,
    paf.size,
    delta.oh,
    delta.it,
    delta.oo,
    saf.channel,
    dc.dc_code,
    1 AS units_in_pack,
    'E'::text AS type
   FROM inventory_smart.latest_inventory_delta delta
     JOIN global.distribution_centres dc ON delta.store_code::integer = dc.name::integer
     JOIN global.store_attributes_filter saf ON delta.store_code::integer = saf.retail_facility_code::integer
     JOIN global.product_attributes_filter paf ON delta.product_code::bigint = paf.product_code::bigint
  WHERE paf.active
UNION
 SELECT paf.article,
    paf.product_code,
    paf.size AS pack_type_id,
    paf.size,
    li.oh,
    li.it,
    li.oo,
    li.channel,
    dc.dc_code,
    1 AS units_in_pack,
    'E'::text AS type
   FROM inventory_smart.latest_inventory li
     JOIN global.distribution_centres dc ON li.store_code::integer = dc.linked_store_code::integer
     JOIN global.product_attributes_filter paf USING (product_code)
  WHERE paf.active AND NOT (EXISTS ( SELECT 1
           FROM inventory_smart.latest_inventory_delta delta
             JOIN global.distribution_centres dc_1 ON dc_1.name::integer = delta.store_code::integer
          WHERE delta.product_code::bigint = li.product_code::bigint AND dc_1.linked_store_code::text = li.store_code::text));
