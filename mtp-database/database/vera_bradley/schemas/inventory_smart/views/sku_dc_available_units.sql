--liquibase formatted sql
--changeset liquibase:sku_dc_available_units runOnChange:true stripComments:false splitStatements:false context:packs_update labels:MTP-17777
--comment: initial changeset for sku_dc_available_units
--rollback: SELECT 1
DROP VIEW IF EXISTS inventory_smart.sku_dc_available_units;
CREATE OR REPLACE VIEW inventory_smart.sku_dc_available_units
AS SELECT paf.article,
    paf.product_code,
    paf.size AS pack_type_id,
    ''::character varying AS parent_article,
    ''::character varying as pack_description,
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
     JOIN global.distribution_centres dc ON li.store_code::text = dc.name::text
     JOIN global.product_attributes_filter paf USING (product_code)
UNION
 SELECT dpi.article,
    dpi.product_code,
    dpi.pack_type_id,
    dpc.parent_article,
    dpc.pack_description,
    dpc.size,
    COALESCE(dpc.units_in_pack, 1) * COALESCE(dpi.oh_pack_qty, 0) AS oh,
    COALESCE(dpc.units_in_pack, 1) * COALESCE(dpi.it_pack_qty, 0) AS it,
    COALESCE(dpc.units_in_pack, 1) * COALESCE(dpi.oo_pack_qty, 0) AS oo,
    dpi.channel,
    dpi.dc_code,
    dpc.units_in_pack,
    0 AS oh_eaches,
    dpi.oh_pack_qty AS oh_packs,
    'S'::text AS type
   FROM inventory_smart.dc_pack_inventory dpi
     FULL JOIN inventory_smart.dc_pack_configuration dpc USING (pack_type_id, article, size, pack_type)
  WHERE dpi.pack_type::text = 'packs'::text;