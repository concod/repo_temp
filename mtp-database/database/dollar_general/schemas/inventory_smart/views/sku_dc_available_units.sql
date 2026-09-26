--liquibase formatted sql
--changeset swapnil.bhange-2:sku_dc_available_units_v2 runOnChange:true stripComments:false splitStatements:false ignore:false context:Release_1_1 labels:002
--comment: chnaged schema for sku_dc_available_units
--rollback: SELECT 1
DROP VIEW IF EXISTS inventory_smart.sku_dc_available_units;

CREATE OR REPLACE VIEW inventory_smart.sku_dc_available_units
AS SELECT paf.article,
    paf.product_code,
    paf.size AS pack_type_id,
    ''::character varying AS parent_article,
    ''::character varying AS pack_description,
    paf.size,
    li.oh,
    li.it,
    li.oo,
    'NC'::character varying AS channel,
    dc.dc_code,
    1 AS units_in_pack,
    li.oh AS oh_eaches,
    0 AS oh_packs,
    'E'::text AS type,
    'eaches'::text as pack_type
   FROM inventory_smart.latest_inventory li
     JOIN global.distribution_centres dc USING(dc_code)
     JOIN global.product_attributes_filter paf USING (product_code)
UNION
 SELECT dpi.article,
    dpi.product_code,
    dpi.pack_type_id,
    NULL::character varying AS parent_article,
    NULL::character varying AS pack_description,
    dpc.size,
    COALESCE(dpc.units_in_pack, 1)::double precision * COALESCE(dpi.oh_pack_qty, 0::real) AS oh,
    COALESCE(dpc.units_in_pack, 1)::double precision * COALESCE(dpi.it_pack_qty, 0::real) AS it,
    COALESCE(dpc.units_in_pack, 1)::double precision * COALESCE(dpi.oo_pack_qty, 0::real) AS oo,
    dpi.channel,
    dc.dc_code,
    dpc.units_in_pack,
    0 AS oh_eaches,
    dpi.oh_pack_qty AS oh_packs,
    'S'::text AS type,
    dpi.pack_type AS pack_type
   FROM inventory_smart.dc_pack_inventory dpi
     FULL JOIN inventory_smart.dc_pack_configuration dpc USING (pack_type_id, article, size, pack_type)
     JOIN global.distribution_centres dc ON dpi.dc_code::text = dc.dc_code::text
  WHERE dpi.pack_type::text = 'packs'::text;