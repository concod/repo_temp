--liquibase formatted sql
--changeset aniruddh.singh:sku_dc_reserved_units_reservation_filter runOnChange:true stripComments:false splitStatements:false context:Release_1_2 labels:sku_dc_reserved_units_reservation_filter
--comment: handle both pack and eaches, add reservation_till_date filter using tenant timezone
--rollback: SELECT 1
DROP VIEW IF EXISTS inventory_smart.sku_dc_reserved_units;
CREATE OR REPLACE VIEW inventory_smart.sku_dc_reserved_units
AS WITH timezone_config AS (
    SELECT trim(text(attribute_value->'value'->'time_zone'), '"') AS tz
    FROM "global".tenant_attribute_master
    WHERE name = 'tenant_time_config'
    LIMIT 1
)
SELECT dpc.product_code,
    dpc.article,
    dpc.size,
    drq.dc_code,
    drq.type,
    drq.channel,
    drq.pack_type_id,
    COALESCE(drq.quantity, 0) * COALESCE(dpc.units_in_pack, 1) AS quantity
   FROM inventory_smart.dc_pack_reserve_quantity drq
     JOIN inventory_smart.dc_pack_configuration dpc USING (pack_type_id, article)
     CROSS JOIN timezone_config
where drq.reservation_till_date >= date(now() at time zone timezone_config.tz);
