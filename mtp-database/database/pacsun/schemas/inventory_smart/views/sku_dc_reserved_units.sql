--liquibase formatted sql
--changeset sreevathsa.sp@impactanalytics.co:sku_dc_reserved_units_v1 runOnChange:true stripComments:false splitStatements:false context:packs_update labels:pacsun_sku_dc_reserved_units
--comment: initial changeset for sku_dc_reserved_units
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
   FROM inventory_smart.dc_reserve_quantity drq;