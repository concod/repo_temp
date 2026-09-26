--liquibase formatted sql
--changeset swapnil.bhange:sku_dc_available_units_v2 runOnChange:true stripComments:false splitStatements:false context:zdt-views labels:MTP-1
--comment: MTP-106579:updated_sku_dc_available_units_v2
--rollback: SELECT 1
DROP VIEW IF EXISTS inventory_smart.sku_dc_available_units;

CREATE OR REPLACE VIEW inventory_smart.sku_dc_available_units
AS WITH delta_base_pre AS MATERIALIZED (
         SELECT paf.article,
            paf.product_code,
            paf.product_code AS pack_type_id,
            paf.size,
            delta.oh,
            delta.store_code,
            saf.channel,
            saf.dc_code,
            1 AS units_in_pack,
            'E'::text AS type
           FROM inventory_smart.latest_inventory_delta delta
             JOIN global.store_attributes_filter saf ON delta.store_code::text = saf.store_code::text
             JOIN global.product_attributes_filter paf ON delta.product_code::text = paf.original_sku::text
          WHERE paf.active
        ), delta_base AS MATERIALIZED (
         SELECT delta.article,
            delta.product_code,
            delta.pack_type_id,
            delta.size,
            delta.oh,
            inv.it,
            inv.oo,
            delta.channel,
            delta.dc_code,
            delta.units_in_pack,
            delta.type
           FROM delta_base_pre delta
             LEFT JOIN inventory_smart.latest_inventory inv ON delta.product_code::text = inv.display_article::text AND delta.store_code::text = inv.store_code::text
        ), inventory_base AS MATERIALIZED (
         SELECT paf.article,
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
           FROM ( SELECT latest_inventory.product_code,
                    latest_inventory.store_code,
                    latest_inventory.oh,
                    latest_inventory.it,
                    latest_inventory.oo,
                    latest_inventory.channel,
                    latest_inventory.display_article
                   FROM inventory_smart.latest_inventory) li
             JOIN global.distribution_centres dc ON li.store_code::text = dc.linked_store_code::text
             JOIN ( SELECT DISTINCT paf_1.article,
                    paf_1.product_code,
                    paf_1.size
                   FROM global.product_attributes_filter paf_1
                  WHERE paf_1.active) paf USING (product_code)
          WHERE NOT (EXISTS ( SELECT 1
                   FROM inventory_smart.latest_inventory_delta delta
                     JOIN global.distribution_centres dc1 ON dc1.linked_store_code::text = delta.store_code::text
                  WHERE delta.product_code::text = li.display_article::text AND dc1.linked_store_code::text = li.store_code::text))
        ), combined AS MATERIALIZED (
         SELECT delta_base.article,
            delta_base.product_code,
            delta_base.pack_type_id,
            delta_base.size,
            delta_base.oh,
            delta_base.it,
            delta_base.oo,
            delta_base.channel,
            delta_base.dc_code,
            delta_base.units_in_pack,
            delta_base.type
           FROM delta_base
        UNION ALL
         SELECT inventory_base.article,
            inventory_base.product_code,
            inventory_base.pack_type_id,
            inventory_base.size,
            inventory_base.oh,
            inventory_base.it,
            inventory_base.oo,
            inventory_base.channel,
            inventory_base.dc_code,
            inventory_base.units_in_pack,
            inventory_base.type
           FROM inventory_base
        )
 SELECT c.article,
    c.product_code,
    c.pack_type_id,
    dpc.pack_description,
    c.size,
    COALESCE(dpc.units_in_pack, 1) * c.oh AS oh,
    COALESCE(dpc.units_in_pack, 1) * c.it AS it,
    COALESCE(dpc.units_in_pack, 1) * c.oo AS oo,
    c.channel,
    c.dc_code,
    dpc.units_in_pack,
    dpi.oh_pack_qty AS oh_packs,
    dpi.oo_pack_qty AS oo_packs,
    dpi.it_pack_qty AS it_packs,
    dpc.pack_type,
        CASE
            WHEN dpc.pack_type::text = 'eaches'::text THEN 'E'::text
            ELSE 'S'::text
        END AS type
   FROM combined c
     LEFT JOIN inventory_smart.dc_pack_inventory dpi ON dpi.article = c.article AND dpi.dc_code = c.dc_code
     LEFT JOIN (select article, pack_type_id, pack_type, units_in_pack , pack_description
	 	from inventory_smart.dc_pack_configuration 
		 group by 1,2,3,4,5
		 order by article,pack_type_id,pack_type )dpc ON dpc.article = c.article AND dpc.pack_type_id = dpi.pack_type_id AND dpc.pack_type = dpi.pack_type
  WHERE c.article IS NOT NULL;