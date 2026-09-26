--liquibase formatted sql
--changeset liquibase:sku_dc_reserved_units runOnChange:true stripComments:false splitStatements:false context:MTP-44616 labels:MTP-44616
--comment: MTP-44616 MTP-43148 add no purge functions to fetch user reserve
--rollback: SELECT 1
DROP VIEW IF EXISTS inventory_smart.sku_dc_reserved_units;
CREATE OR REPLACE VIEW inventory_smart.sku_dc_reserved_units
AS SELECT pmpd.product_code,
    paf.article,
    coalesce(drq.pack_type_id, paf.size) as size,
    pmpd.dc_code,
    drq.type,
    drq.channel,
    sum(drq.quantity) AS quantity,
    (case when paf.size != drq.pack_type_id then true else false end) as pack_flag,
    coalesce(dpc.units_in_pack, 1) units_in_pack
   FROM inventory_smart.dc_reserve_quantity drq
     JOIN global.product_mapping_product_dc pmpd USING (product_code, dc_code)
     JOIN global.product_attributes_filter paf USING (product_code)
     left join inventory_smart.dc_pack_configuration dpc using (article, product_code, pack_type_id)
     WHERE (drq.created_at > (now() - interval '2 hours') AND drq.channel = 'RLS') or drq.channel = 'PFS'
  GROUP BY pmpd.product_code, paf.article, drq.pack_type_id, pmpd.dc_code, drq.type, drq.channel, paf.size, dpc.units_in_pack;
