-- liquibase formatted sql
-- changeset liquibase:sku_ns_available_units_updating_oh_packs_and_oh_eaches_v3 runOnChange:true stripComments:false splitStatements:false context:MTP-112262_v3 labels:MTP-112262_v3
-- comment: MTP-112262 updating oh_packs and oh_eaches v3

DROP VIEW IF EXISTS inventory_smart.sku_ns_available_units;
CREATE OR REPLACE VIEW inventory_smart.sku_ns_available_units
AS SELECT 
    DISTINCT nsis.article,
    dpc.product_code,
    nsis.pack_type_id,
    dpc.pack_description,
    dpc.size,
    COALESCE(sum(nsis.oh_pack_qty * dpc.units_in_pack), 0::bigint) AS oh,
    nsis.oh_pack_qty AS oh_packs,
    0 AS it,
    0 AS oo,
    nsis.channel,
    nsis.dc_code,
    dpc.units_in_pack,
    0 AS oh_eaches,
    0 AS oo_packs,
    0 AS it_packs,
    'S'::text AS type,
    nsis.pack_type
   FROM inventory_smart.new_store_inventory_source nsis
     LEFT JOIN inventory_smart.dc_pack_configuration dpc USING (article, pack_type_id, pack_type)
  WHERE nsis.pack_type::text = 'packs'::text
  GROUP BY nsis.article, dpc.product_code, nsis.pack_type_id, dpc.pack_description, dpc.size, nsis.oh_pack_qty, nsis.channel, 
      nsis.dc_code, dpc.units_in_pack, 'S'::text, 0::integer, nsis.pack_type
UNION
 SELECT 
    DISTINCT nsis.article,
    dpc.product_code,
    nsis.pack_type_id,
    dpc.pack_description,
    dpc.size,
    COALESCE(sum(nsis.oh_pack_qty * dpc.units_in_pack), 0::bigint) AS oh,
    0 AS oh_packs,
    0 AS it,
    0 AS oo,
    nsis.channel,
    nsis.dc_code,
    dpc.units_in_pack,
    nsis.oh_pack_qty AS oh_eaches,
    0 AS oo_packs,
    0 AS it_packs,
    'S'::text AS type,
    nsis.pack_type
   FROM inventory_smart.new_store_inventory_source nsis
     LEFT JOIN inventory_smart.dc_pack_configuration dpc USING (article, pack_type_id, pack_type)
  WHERE nsis.pack_type::text = 'eaches'::text
  GROUP BY nsis.article, dpc.product_code, nsis.pack_type_id, dpc.pack_description, dpc.size, nsis.oh_pack_qty, nsis.channel, 
      nsis.dc_code, dpc.units_in_pack, 'S'::text, 0::integer, nsis.pack_type;