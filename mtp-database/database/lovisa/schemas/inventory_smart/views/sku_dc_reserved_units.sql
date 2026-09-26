--liquibase formatted sql
--changeset liquibase:sku_dc_reserved_units_v2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sku_dc_reserved_units_v2
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
