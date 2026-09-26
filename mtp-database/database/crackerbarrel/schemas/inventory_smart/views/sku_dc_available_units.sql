--liquibase formatted sql
--changeset aniruddh.singh:MTP-81178 changes in sku_dc_available_units runOnChange:true stripComments:false splitStatements:false context:Release_1_4 labels:MTP-81178
--comment: MTP-81178 changes in sku_dc_available_units
--rollback: SELECT 1
DROP VIEW IF EXISTS inventory_smart.sku_dc_available_units;
CREATE OR REPLACE VIEW inventory_smart.sku_dc_available_units
as SELECT paf.l0_name,
	dpi.article,
    dpc.product_code,
    dpi.pack_type_id,
    dpc.pack_description,
    dpc.size,
    COALESCE(dpc.units_in_pack, 1) * COALESCE(dpi.oh_pack_qty, 0) AS oh,
    COALESCE(dpc.units_in_pack, 1) * COALESCE(dpi.it_pack_qty, 0) AS it,
    COALESCE(dpc.units_in_pack, 1) * COALESCE(dpi.oo_pack_qty, 0) AS oo,
	COALESCE(dpc.units_in_pack, 1) * COALESCE(dpi.oh_pack_qty, 0) + COALESCE(dpc.units_in_pack, 1) * COALESCE(dpi.oo_pack_qty, 0) as oh_oo,
    dpi.channel,
    dpi.dc_code,
    dpc.units_in_pack AS units_in_pack,
    dpi.oh_pack_qty AS oh_packs,
    dpi.oo_pack_qty AS oo_packs,
    dpi.it_pack_qty AS it_packs,
    dpc.pack_type,
    CASE 
        WHEN dpc.pack_type::text = 'eaches'::text THEN 'E'::text 
        ELSE 'S'::text 
    END AS type
   FROM inventory_smart.dc_pack_inventory dpi
     FULL JOIN inventory_smart.dc_pack_configuration dpc USING (pack_type_id, article, pack_type, product_code)
     join global.product_attributes_filter paf using (Product_code);