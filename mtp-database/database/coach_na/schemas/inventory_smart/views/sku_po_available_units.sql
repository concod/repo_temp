--liquibase formatted sql
--changeset liquibase:sku_dc_allocations_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start_1
--comment: initial changeset for sku_dc_allocations_1
--rollback: SELECT 1
DROP VIEW IF EXISTS inventory_smart.sku_po_available_units;

-- inventory_smart.sku_po_available_units source

CREATE OR REPLACE VIEW inventory_smart.sku_po_available_units
AS  SELECT dpc.article,
    dpc.product_code,
    dpc.pack_type_id,
    dpc.pack_type,
    dpc.pack_description,
    dpc.size,
    COALESCE(dpc.units_in_pack, 1)::double precision * COALESCE(pm.quantity ::real, 0::real) AS oh,
    0 AS oh_eaches,
    pm.quantity AS oh_packs,
    pm.channel,
    pm.po_code,
    dc_code,
    pm.requirement_date,
    dpc.units_in_pack,
    'S'::text AS type,
  NULL::text AS number_of_allocations,
         pm.vendor_id,
    pm.validity_period_start
   FROM inventory_smart.po_master pm
     JOIN inventory_smart.dc_pack_configuration dpc USING (product_code)
  WHERE dpc.pack_type::text = 'packs'::text
  UNION
 SELECT dpc.article,
    dpc.product_code,
    dpc.pack_type_id,
    dpc.pack_type,
    dpc.pack_description,
    dpc.size,
    COALESCE(dpc.units_in_pack, 1)::double precision * COALESCE(pm.quantity::real, 0::real) AS oh,
    pm.quantity AS oh_eaches,
    0 AS oh_packs,
    pm.channel,
    pm.po_code,
    dc_code,
    pm.requirement_date,
    dpc.units_in_pack,
    'S'::text AS type,
   NULL::text AS number_of_allocations,
       pm.vendor_id,
    pm.validity_period_start
   FROM inventory_smart.po_master pm
     JOIN inventory_smart.dc_pack_configuration dpc USING (product_code)
  WHERE dpc.pack_type::text = 'eaches'::text;