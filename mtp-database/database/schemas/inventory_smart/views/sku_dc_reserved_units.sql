--liquibase formatted sql
--changeset liquibase:sku_dc_reserved_units runOnChange:true stripComments:false splitStatements:false context:add article and size labels:fix view
--comment: add article and size , sum up quantity
--rollback: SELECT 1
DROP VIEW IF EXISTS inventory_smart.sku_dc_reserved_units;
CREATE OR REPLACE VIEW inventory_smart.sku_dc_reserved_units
AS SELECT pmpd.product_code,
    paf.article,
    paf.size,
    pmpd.dc_code,
    drq.type,
    drq.channel,
    sum(drq.quantity) AS quantity
   FROM inventory_smart.dc_reserve_quantity drq
     JOIN global.product_mapping_product_dc pmpd USING (product_code, dc_code)
     JOIN global.product_attributes_filter paf USING (product_code)
  GROUP BY pmpd.product_code, paf.article, paf.size, pmpd.dc_code, drq.type, drq.channel;