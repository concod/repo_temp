--liquibase formatted sql
--changeset liquibase:sku_dc_available_units runOnChange:true stripComments:false splitStatements:false context:fix_view labels:fix_view
--comment: fix wrong view in wrong file
--rollback: SELECT 1
DROP VIEW IF EXISTS inventory_smart.sku_dc_available_units;
CREATE OR REPLACE VIEW inventory_smart.sku_dc_available_units
AS SELECT paf.article,
    paf.product_code,
    paf.size AS pack_type_id,
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
     JOIN global.product_attributes_filter paf USING (product_code);