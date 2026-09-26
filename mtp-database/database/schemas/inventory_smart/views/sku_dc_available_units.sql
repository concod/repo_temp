--liquibase formatted sql
--changeset liquibase:sku_dc_available_units runOnChange:true stripComments:false splitStatements:false ignore:false context:Release_1_1 labels:liquibase_project_start
--comment: initial changeset for sku_dc_available_units
--rollback: SELECT 1
DROP VIEW IF EXISTS inventory_smart.sku_dc_available_units;
CREATE OR REPLACE VIEW inventory_smart.sku_dc_available_units
AS SELECT li.child_sku,
    li.product_code,
    sm.dc_code,
    saf.channel,
    li.oh,
    li.oo,
    li.it
   FROM inventory_smart.latest_inventory li
     JOIN global.store_master sm USING (store_code)
     JOIN global.store_attributes_filter saf USING (store_code)
  WHERE sm.dc_code IS NOT NULL;
;