--liquibase formatted sql
--changeset liquibase:join corrected sku_dc_available_units runOnChange:true stripComments:false splitStatements:false context:MTP-75831 labels:MTP-75831
--comment: join corrected for pack inventory
--rollback: SELECT 1
DROP VIEW IF EXISTS inventory_smart.sku_dc_available_units;

CREATE OR REPLACE VIEW inventory_smart.sku_dc_available_units
AS SELECT dpi.article,
    dpc.product_code,
    dpi.pack_type_id,
    dpc.pack_description,
    dpc.size,
    COALESCE(dpc.units_in_pack, 1::double precision) * COALESCE(dpi.oh_pack_qty, 0::real) AS oh,
    COALESCE(dpc.units_in_pack, 1::double precision) * COALESCE(dpi.it_pack_qty, 0::real) AS it,
    COALESCE(dpc.units_in_pack, 1::double precision) * COALESCE(dpi.oo_pack_qty, 0::real) AS oo,
    dpi.channel,
    dpi.dc_code,
    dpc.units_in_pack,
    dpi.oh_pack_qty AS oh_packs,
    dpi.oo_pack_qty AS oo_packs,
    dpi.it_pack_qty AS it_packs,
    dpc.pack_type,
    'S'::text AS type
   FROM inventory_smart.dc_pack_inventory dpi
     FULL JOIN inventory_smart.dc_pack_configuration dpc USING (pack_type_id, article, pack_type, product_code);