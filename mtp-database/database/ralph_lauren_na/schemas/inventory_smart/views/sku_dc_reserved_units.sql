--liquibase formatted sql
--changeset liquibase:sku_dc_reserved_units runOnChange:true stripComments:false splitStatements:false context:MTP-44616 labels:MTP-44616
--comment: MTP-44616 MTP-43148 add no purge functions to fetch user reserve
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
    1 as units_in_pack
   FROM inventory_smart.dc_reserve_quantity drq
     JOIN global.product_mapping_product_dc pmpd USING (product_code, dc_code)
     JOIN global.product_attributes_filter paf USING (product_code)
     WHERE (drq.created_at > (now() - interval '2 hours') AND drq.channel = 'RLS') or drq.channel = 'PFS'
  GROUP BY pmpd.product_code, paf.article, paf.size, pmpd.dc_code, drq.type, drq.channel;