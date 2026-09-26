-- liquibase formatted sql
-- changeset liquibase:sku_dc_reserved_units_filter runOnChange:true stripComments:false splitStatements:false context:MTP-45674 labels:sku_dc_reserved_units_filter
-- comment: reservation_till_date filter for sku_dc_reserved_units
DROP VIEW IF EXISTS inventory_smart.sku_dc_reserved_units;
CREATE OR REPLACE VIEW inventory_smart.sku_dc_reserved_units
AS SELECT dpc.product_code,
    dpc.article,
    dpc.size,
    drq.dc_code,
    drq.type,
    drq.channel,
    drq.pack_type_id,
    COALESCE(drq.quantity, 0) * COALESCE(dpc.units_in_pack, 1) AS quantity
   FROM inventory_smart.dc_pack_reserve_quantity drq
     JOIN inventory_smart.dc_pack_configuration dpc USING (pack_type_id, article)
where drq.reservation_till_date >= date(now() at time zone 'America/New_York');