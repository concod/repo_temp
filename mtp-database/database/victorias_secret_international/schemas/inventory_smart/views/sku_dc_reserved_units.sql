--liquibase formatted sql
--changeset kanishka.parashar@impactanalytics.co:sku_dc_reserved_units_v1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: sku_dc_reserved_units_view
--rollback: SELECT 1
DROP VIEW IF EXISTS inventory_smart.sku_dc_reserved_units;
CREATE OR REPLACE VIEW inventory_smart.sku_dc_reserved_units
AS SELECT paf.l0_name,
    drq.product_code,
    paf.article,
    paf.size,
    drq.dc_code,
    drq.type,
    drq.channel,
    sum(drq.quantity) AS quantity,
    1 AS units_in_pack
   FROM inventory_smart.dc_reserve_quantity drq
     JOIN global.product_attributes_filter paf USING (product_code)
  GROUP BY paf.l0_name, drq.product_code, paf.article, paf.size, drq.dc_code, drq.type, drq.channel;
