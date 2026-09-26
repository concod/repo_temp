--liquibase formatted sql
--changeset suryasai.gopal:sku_po_available_units runOnChange:true stripComments:false splitStatements:false context:MTP-51578 labels:
--comment: sku_po_available_units MTP-51578
--rollback: SELECT 1
DROP VIEW IF EXISTS inventory_smart.sku_po_available_units;
CREATE OR REPLACE VIEW inventory_smart.sku_po_available_units
as
SELECT paf.article,
    paf.product_code,
    paf.size AS pack_type_id,
    ''::character varying AS parent_article,
    ''::character varying AS pack_description,
    paf.size,
    pm.available_qty AS oh,
    pm.available_qty AS oh_eaches,
    0 AS oh_packs,
    pm.channel,
    pm.po_code,
    pm.dc_code,
    pm.requirement_date,
    1 AS units_in_pack,
    'E'::text AS type,
    0 as  number_of_allocations
   FROM inventory_smart.po_master pm
     JOIN global.product_attributes_filter paf USING (product_code)
  WHERE pm.pack_type_id::text = pm.product_code::text;