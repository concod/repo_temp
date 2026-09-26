-- inventory_smart.sku_po_available_units source
--liquibase formatted sql
--changeset anshuman.ghosh@impactanlytics.co:sku_po_available_units runOnChange:true stripComments:false splitStatements:false context:Release_1_2 labels:liquibase_project_start
--comment: initial changeset for sku_po_available_units
DROP VIEW IF EXISTS inventory_smart.sku_po_available_units;
CREATE OR REPLACE VIEW inventory_smart.sku_po_available_units
AS SELECT paf.article,
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
    number_of_allocations
   FROM inventory_smart.po_master pm
     JOIN global.product_attributes_filter paf USING (product_code)
  WHERE pm.pack_type_id::text = pm.product_code::text
UNION
 SELECT dpc.article,
    dpc.product_code,
    dpc.pack_type_id,
    dpc.parent_article,
    dpc.pack_description,
    dpc.size,
    COALESCE(dpc.units_in_pack, 1)::double precision * COALESCE(pm.available_qty::real, 0::real) AS oh,
    0 AS oh_eaches,
    pm.available_qty AS oh_packs,
    pm.channel,
    pm.po_code,
    pm.dc_code,
    pm.requirement_date,
    dpc.units_in_pack,
    'S'::text AS type,
    number_of_allocations
   FROM inventory_smart.po_master pm
     JOIN inventory_smart.dc_pack_configuration dpc USING (pack_type_id, product_code)
  WHERE dpc.pack_type::text = 'packs'::text;