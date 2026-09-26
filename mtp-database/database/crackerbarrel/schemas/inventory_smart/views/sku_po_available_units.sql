--liquibase formatted sql
--changeset aniruddh.singh@impactanalytics.co:MTP-81178 adding pack_type in sku_po_available_units runOnChange:true stripComments:false splitStatements:false context:Release_1_4 labels:MTP-81178
--comment: MTP-81178 adding pack_type in sku_po_available_units
--rollback: SELECT 1
DROP VIEW IF EXISTS inventory_smart.sku_po_available_units;
CREATE OR REPLACE VIEW inventory_smart.sku_po_available_units
AS SELECT dpc.article,
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
    dpc.pack_type AS pack_type,
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
  WHERE dpc.pack_type::text = 'packs'::text
  and requirement_date
BETWEEN (CURRENT_DATE - INTERVAL '28 days')  
AND (CURRENT_DATE + INTERVAL '28 days')
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
    dpc.units_in_pack AS units_in_pack,
    'E'::text AS type,
    dpc.pack_type AS pack_type,
    NULL::text AS number_of_allocations
   FROM inventory_smart.po_master pm
     JOIN inventory_smart.dc_pack_configuration dpc USING (pack_type_id, product_code)
  WHERE dpc.pack_type::text = 'eaches'::text
  and requirement_date
BETWEEN (CURRENT_DATE - INTERVAL '28 days')  
AND (CURRENT_DATE + INTERVAL '28 days');