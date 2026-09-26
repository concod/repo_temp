--liquibase formatted sql
--changeset liquibase:aniruddh.singh@impactanalytics.co:sku_dc_reserved_units runOnChange:true stripComments:false splitStatements:false context:MTP-69097 labels:MTP-69097
--comment: remove pack_type_id from sku_dc_reserved_units
--rollback: SELECT 1
DROP VIEW IF EXISTS inventory_smart.sku_dc_reserved_units;
CREATE OR REPLACE VIEW inventory_smart.sku_dc_reserved_units
AS SELECT drq.product_code,
    drq.article,
    drq.size,
    drq.dc_code,
    drq.type,
    drq.channel,
    drq.product_code as pack_type_id,
    drq.quantity,
    0 AS quantity_packs
   FROM inventory_smart.dc_reserve_quantity drq
   WHERE reservation_till_date >= (now() AT TIME ZONE 'Pacific/Auckland')::date ;
