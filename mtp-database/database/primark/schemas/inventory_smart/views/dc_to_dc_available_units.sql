--liquibase formatted sql
--changeset aman.lakkoju:dc_to_dc_available_units_updates  runOnChange:true stripComments:false splitStatements:false context:Release_1_2 labels:dc_to_dc_available_units_updates
--comment: dc_to_dc_available_units_updates
--rollback: SELECT 1

DROP VIEW IF EXISTS  inventory_smart.dc_to_dc_available_units;
CREATE OR REPLACE VIEW inventory_smart.dc_to_dc_available_units
AS WITH store_attributes AS (
         SELECT store_attributes_filter.store_code,
            store_attributes_filter.channel
           FROM global.store_attributes_filter
          WHERE upper(store_attributes_filter.special_classification::text) = 'WHS'::text AND store_attributes_filter.is_deleted = false
        ), inventory_base AS (
         SELECT lir.product_code,
            lir.store_code,
            lir.oh,
            lir.oo,
            lir.it,
            sa.channel
           FROM inventory_smart.latest_inventory lir
             JOIN store_attributes sa ON lir.store_code::text = sa.store_code::text
        ), mapping_table AS (
         SELECT product_supersession_mapping.product_code AS new_product_code,
            product_supersession_mapping.old_product_code
           FROM inventory_smart.product_supersession_mapping
          WHERE CURRENT_DATE >= product_supersession_mapping.start_date AND CURRENT_DATE <= product_supersession_mapping.end_date
        ), final_base AS (
         SELECT COALESCE(m.new_product_code, ib.product_code) AS product_code,
            ib.store_code,
            ib.channel,
            sum(ib.it) AS it,
            sum(ib.oh) AS oh,
            sum(ib.oo) AS oo
           FROM inventory_base ib
             LEFT JOIN mapping_table m ON ib.product_code::text = m.old_product_code::text
          GROUP BY (COALESCE(m.new_product_code, ib.product_code)), ib.store_code, ib.channel
        UNION
         SELECT a.product_code,
            a.store_code,
            a.channel,
            sum(COALESCE(a.it, 0)) AS it,
            sum(COALESCE(a.oh::numeric, 0::numeric)) AS oh,
            sum(COALESCE(a.oo, 0)) AS oo
           FROM inventory_base a
             JOIN mapping_table m ON a.product_code::text = m.old_product_code::text
          GROUP BY a.product_code, a.store_code, a.channel
        )
 SELECT paf.l0_name,
    paf.article,
    paf.product_code,
    COALESCE(dc_pack_configuration.pack_type_id, paf.product_code) AS pack_type_id,
    paf.size,
    fb.oh,
    fb.it,
    fb.oo,
    fb.channel,
    dc.dc_code,
    COALESCE(dc_pack_configuration.units_in_pack, 1) AS units_in_pack,
        CASE
            WHEN dc_pack_configuration.pack_type::text = 'packs'::text THEN 'P'::text
            ELSE 'E'::text
        END AS type
   FROM final_base fb
     LEFT JOIN inventory_smart.dc_pack_configuration USING (product_code)
     JOIN global.distribution_centres dc ON fb.store_code::text = dc.linked_store_code::text
     JOIN global.product_attributes_filter paf ON fb.product_code::text = paf.product_code::text;