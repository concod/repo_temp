--liquibase formatted sql
--changeset navin.chandan@impactanalytics.co:MTP-81178 changes in sku_dc_available_units runOnChange:true stripComments:false splitStatements:false context:MTP-81178 labels:MTP-81178
--comment: MTP-81178 changes in sku_dc_available_units
--rollback: SELECT 1
DROP VIEW IF EXISTS inventory_smart.sku_dc_available_units;
CREATE OR REPLACE VIEW inventory_smart.sku_dc_available_units
AS SELECT 
  dpi.article,
    dpc.product_code,
    dpi.pack_type_id,
    dpc.pack_description,
    dpc.size,
    GREATEST(COALESCE(dpc.units_in_pack, 1) * COALESCE(dpi.oh_pack_qty, 0), 0) AS oh,
    GREATEST(COALESCE(dpc.units_in_pack, 1) * COALESCE(dpi.it_pack_qty, 0), 0) AS it,
    GREATEST(COALESCE(dpc.units_in_pack, 1) * COALESCE(dpi.oo_pack_qty, 0), 0) AS oo,
    dpi.channel,
    dpi.dc_code,
    dpc.units_in_pack,
    GREATEST(dpi.oh_pack_qty, 0) AS oh_packs,
    GREATEST(dpi.oo_pack_qty, 0) AS oo_packs,
    GREATEST(dpi.it_pack_qty, 0) AS it_packs,
    'eaches' as pack_type,
    'E' as type
  FROM inventory_smart.dc_pack_inventory dpi
  FULL JOIN inventory_smart.dc_pack_configuration dpc USING (pack_type_id, article, size, pack_type)
  where pack_type = 'eaches'
union all 
SELECT 
  dpi.article,
    dpc.product_code,
    dpi.pack_type_id,
    dpc.pack_description,
    dpc.size,
    GREATEST(dpi.oh_pack_qty, 0) AS oh,
    GREATEST(dpi.oo_pack_qty, 0) AS oo,
    GREATEST(dpi.it_pack_qty, 0) AS it,
    dpi.channel,
    dpi.dc_code,
    dpc.units_in_pack,
    GREATEST(dpi.oh_pack_qty, 0) AS oh_packs,
    GREATEST(dpi.oo_pack_qty, 0) AS oo_packs,
    GREATEST(dpi.it_pack_qty, 0) AS it_packs,
    'eaches' as pack_type,
    'E' as type
  FROM inventory_smart.dc_pack_inventory dpi
  FULL JOIN inventory_smart.dc_pack_configuration dpc USING (pack_type_id, article, size, pack_type)
  where pack_type = 'packs';
