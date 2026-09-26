--liquibase formatted sql
--changeset liquibase:sku_po_available_units runOnChange:true stripComments:false splitStatements:false context:MTP-100717 labels:MTP-100717
--comment: getting pack_type in sku_po_available_units
--rollback: SELECT 1

DROP VIEW IF EXISTS inventory_smart.sku_po_available_units;

CREATE OR REPLACE VIEW inventory_smart.sku_po_available_units
AS SELECT dpc.article,
    dpc.product_code,
    dpc.pack_type_id,
    dpc.pack_type,
    dpc.pack_description,
    dpc.size,
    COALESCE(dpc.units_in_pack, 1)::double precision * COALESCE(pm.available_qty::real, 0::real) AS oh,
    0 AS oh_eaches,
    pm.available_qty AS oh_packs,
    pm.channel,
    pm.po_code,
    pm.dc_code,
    pm.requirement_date,
    dpc.units_in_pack,
    'S'::text AS type,
    pm.number_of_allocations
   FROM inventory_smart.po_master pm
     JOIN inventory_smart.dc_pack_configuration dpc USING (pack_type_id, article)
  WHERE dpc.pack_type::text = 'packs'::text
UNION
 SELECT dpc.article,
    dpc.product_code,
    dpc.pack_type_id,
    dpc.pack_type,
    dpc.pack_description,
    dpc.size,
    COALESCE(dpc.units_in_pack, 1)::double precision * COALESCE(pm.available_qty::real, 0::real) AS oh,
    pm.available_qty AS oh_eaches,
    0 AS oh_packs,
    pm.channel,
    pm.po_code,
    pm.dc_code,
    pm.requirement_date,
    dpc.units_in_pack,
    'S'::text AS type,
    pm.number_of_allocations
   FROM inventory_smart.po_master pm
     JOIN inventory_smart.dc_pack_configuration dpc USING (pack_type_id, article)
  WHERE dpc.pack_type::text = 'eaches'::text;