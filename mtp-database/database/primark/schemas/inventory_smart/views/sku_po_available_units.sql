--liquibase formatted sql
--changeset aman_lakkoju_:sku_po_available_units_updated  runOnChange:true stripComments:false splitStatements:false context:Release_1_2 labels:sku_po_available_units_updated 
--comment: sku_po_available_units_updated 
--rollback: SELECT 1
DROP VIEW IF EXISTS inventory_smart.sku_po_available_units;
CREATE OR REPLACE VIEW inventory_smart.sku_po_available_units
AS  SELECT dpc.article,
    dpc.product_code,
    dpc.pack_type_id,
    dpc.pack_description,
    dpc.size,
    COALESCE(dpc.units_in_pack, 1)::double precision * COALESCE(pm.oh_packs::real, 0::real) AS oh,
    0 AS oh_eaches,
    pm.oh_oo AS oh_packs,
    pm.channel,
    pm.po_code,
    pm.dc_code,
    pm.requirement_date,
    dpc.units_in_pack,
    'S'::text AS type,
    NULL::text AS number_of_allocations
   FROM ( SELECT a.product_code,
            a.pack_type_id,
            paf.article,
            a.allocated_qty AS oh_packs,
            a.oh_pack_qty + a.oo_pack_qty AS oh_oo,
            'B__ia_char_13M'::character varying AS channel,
            a.po_code,
            a.dc_code,
            a.requirement_date
           FROM inventory_smart.po_master a
             LEFT JOIN global.product_attributes_filter paf USING (product_code)) pm
     JOIN inventory_smart.dc_pack_configuration dpc USING (pack_type_id, article)
  WHERE dpc.pack_type::text = 'packs'::text AND pm.requirement_date >= CURRENT_DATE AND pm.requirement_date <= (CURRENT_DATE + '90 days'::interval)
UNION
 SELECT dpc.article,
    dpc.product_code,
    dpc.pack_type_id,
    dpc.pack_description,
    dpc.size,
    COALESCE(dpc.units_in_pack, 1)::double precision * COALESCE(pm.allocated_qty::real, 0::real) AS oh,
    pm.allocated_qty AS oh_eaches,
    0 AS oh_packs,
    'B__ia_char_13M'::character varying AS channel,
    pm.po_code,
    pm.dc_code,
    pm.requirement_date,
        CASE
            WHEN dpc.pack_type::text = 'eaches'::text THEN COALESCE(uom.factor, 1::real)
            ELSE dpc.units_in_pack::real
        END AS units_in_pack,
    'S'::text AS type,
    NULL::text AS number_of_allocations
   FROM inventory_smart.po_master pm
     JOIN inventory_smart.dc_pack_configuration dpc USING (pack_type_id, product_code)
     LEFT JOIN inventory_smart.uom uom ON dpc.pack_type::text = 'eaches'::text AND uom.article::text = dpc.article::text AND uom.item_id::text = dpc.product_code::text
  WHERE dpc.pack_type::text = 'eaches'::text AND pm.requirement_date >= CURRENT_DATE AND pm.requirement_date <= (CURRENT_DATE + '90 days'::interval);
