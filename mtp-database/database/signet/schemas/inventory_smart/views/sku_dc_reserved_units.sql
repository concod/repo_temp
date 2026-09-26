--liquibase formatted sql
--changeset liquibase:sku_dc_reserved_units runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sku_dc_reserved_units
--rollback: SELECT 1
DROP VIEW IF EXISTS inventory_smart.sku_dc_reserved_units;
CREATE OR REPLACE VIEW inventory_smart.sku_dc_reserved_units
AS SELECT pmpd.product_code,
    paf.article,
    paf.size,
    pmpd.dc_code,
    drq.type,
    drq.channel,
    sum(drq.quantity) AS quantity,
    max(drq.created_at) AS updated_at
   FROM inventory_smart.dc_reserve_quantity drq
     JOIN global.product_mapping_product_dc pmpd USING (product_code, dc_code)
     JOIN global.product_attributes_filter paf USING (product_code)
  GROUP BY pmpd.product_code, paf.article, paf.size, pmpd.dc_code, drq.type, drq.channel;
