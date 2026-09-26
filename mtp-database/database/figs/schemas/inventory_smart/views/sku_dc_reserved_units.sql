--liquibase formatted sql
--changeset liquibase:keerthi.vardhani@impactanalytics.co:sku_dc_reserved_units runOnChange:true stripComments:false splitStatements:false context:MTP-69097 labels:MTP-69097
--comment: remove pack_type_id from sku_dc_reserved_units
--rollback: SELECT 1
DROP VIEW IF EXISTS inventory_smart.sku_dc_reserved_units;
CREATE OR REPLACE VIEW inventory_smart.sku_dc_reserved_units
AS WITH timezone_config AS (
         SELECT COALESCE(NULLIF(inventory_smart.get_tenant_timezone(), ''), 'US/eastern') AS tz
        )
 SELECT 
 	drq.product_code,
    drq.article,
    drq.size,
    drq.dc_code,
    drq.type,
    drq.channel,
    drq.product_code AS pack_type_id,
    COALESCE(drq.quantity, 0) AS quantity,
    0 AS quantity_packs
   FROM inventory_smart.dc_reserve_quantity drq
     CROSS JOIN timezone_config
  WHERE drq.reservation_till_date >= date((now() AT TIME ZONE timezone_config.tz));