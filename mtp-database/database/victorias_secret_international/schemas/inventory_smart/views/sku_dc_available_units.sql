--liquibase formatted sql
--changeset adesh:sku_dc_available_units runOnChange:true stripComments:false splitStatements:false context:MTP-73133 labels:MTP-73133
--comment: MTP-73133-sku_dc_available_units_initial
--rollback: SELECT 1
DROP VIEW IF EXISTS inventory_smart.sku_dc_available_units;
CREATE OR REPLACE VIEW inventory_smart.sku_dc_available_units
AS SELECT paf.l0_name,
    paf.article,
    paf.product_code,
    paf.product_code AS pack_type_id,
    paf.size,
    li.oh,
    li.it,
    li.oo,
    li.channel,
    dc.dc_code,
    1 AS units_in_pack,
    'E'::text AS type
   FROM inventory_smart.latest_inventory li
    JOIN global.distribution_centres dc ON li.store_code::text = dc.linked_store_code::text
    JOIN global.product_attributes_filter paf USING (product_code)
    JOIN global.store_attributes_filter saf ON li.store_code::text = saf.store_code::text;
