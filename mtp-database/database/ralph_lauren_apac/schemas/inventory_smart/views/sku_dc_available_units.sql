--liquibase formatted sql
--changeset adesh.kumar:sku_dc_available_units runOnChange:true stripComments:false splitStatements:false context:MTP-29953 labels:MTP-29953
--comment: MTP-29953 remove multiplication with units in pack
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
    delta.oh AS oh_eaches,
    0 AS oh_packs,
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
    li.oh AS oh_eaches,
    0 AS oh_packs,
    'E'::text AS type
   FROM inventory_smart.latest_inventory li
     JOIN global.distribution_centres dc ON li.store_code::integer = dc.linked_store_code::integer
     JOIN global.product_attributes_filter paf USING (product_code)
  WHERE paf.active AND NOT (EXISTS ( SELECT 1
           FROM inventory_smart.latest_inventory_delta delta
             JOIN global.distribution_centres dc_1 ON dc_1.name::integer = delta.store_code::integer
          WHERE delta.product_code::bigint = li.product_code::bigint AND dc_1.linked_store_code::text = li.store_code::text))
UNION
 SELECT dpi.article,
    dpi.product_code,
    dpi.pack_type_id,
    dpc.size,
    COALESCE(dpi.oh_pack_qty, 0) AS oh,
    COALESCE(dpi.it_pack_qty, 0) AS it,
    COALESCE(dpi.oo_pack_qty, 0) AS oo,
    dpi.channel,
    dpi.dc_code,
    dpc.units_in_pack,
    0 AS oh_eaches,
    COALESCE(dpi.oh_pack_qty/dpc.units_in_pack, 0) AS oh_packs,
    'S'::text AS type
   FROM inventory_smart.dc_pack_inventory dpi
     FULL JOIN inventory_smart.dc_pack_configuration dpc USING (pack_type_id, article, size, pack_type)
  WHERE dpi.pack_type::text = 'packs'::text;
