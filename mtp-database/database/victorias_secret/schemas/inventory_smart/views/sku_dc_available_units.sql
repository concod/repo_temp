--liquibase formatted sql
--changeset aniruddh.singh:sku_dc_available_units_v8 runOnChange:true stripComments:false splitStatements:false context:adding pack_type as eaches labels:VS-273
--comment: adding pack_type as eaches
--rollback: SELECT 1
DROP VIEW IF EXISTS inventory_smart.sku_dc_available_units;
CREATE OR REPLACE VIEW inventory_smart.sku_dc_available_units
AS WITH latest_inventory_delta_base AS (
         SELECT a.product_code,
            a.store_code,
            a.oh,
            a.oo,
            a.it,
            a.wip,
            a.channel,
            a.updation_rank
           FROM ( SELECT lid.product_code,
                    lid.store_code,
                    lid.oh,
                    lid.oo,
                    lid.it,
                    lid.wip,
                    saf.channel,
                    row_number() OVER (PARTITION BY lid.product_code, lid.store_code ORDER BY lid.updated_at DESC) AS updation_rank
                   FROM inventory_smart.latest_inventory_delta lid
                     JOIN global.store_attributes_filter saf USING (store_code)
                  WHERE upper(saf.store_category::text) = 'DC'::text AND saf.is_deleted = false AND upper(saf.channel::text) = 'RETAIL'::text) a
          WHERE a.updation_rank = 1
        ), latest_inventory_delta AS (
         SELECT lidb.product_code,
            lidb.store_code,
            lidb.oh - COALESCE(lir.wip,0) AS oh,
            COALESCE(lidb.oo, 0) AS oo,
            COALESCE(lidb.it, 0) AS it,
            COALESCE(lir.wip, 0) AS wip,
            lidb.channel
           FROM latest_inventory_delta_base lidb
             LEFT JOIN inventory_smart.latest_inventory_raw lir USING (product_code, store_code)
        ), latest_inventory_raw AS (
         SELECT lir.product_code,
            lir.store_code,
            lir.oh,
            lir.oo,
            lir.it,
            lir.wip,
            lir.channel
           FROM inventory_smart.latest_inventory_raw lir
             JOIN global.store_attributes_filter saf USING (store_code)
          WHERE upper(saf.store_category::text) = 'DC'::text AND saf.is_deleted = false AND upper(saf.channel::text) = 'RETAIL'::text AND NOT (EXISTS ( SELECT 1
                   FROM latest_inventory_delta lid
                  WHERE lid.product_code::text = lir.product_code::text AND lid.store_code::text = lir.store_code::text))
        ), inventory_base AS (
         SELECT latest_inventory_delta.product_code,
            latest_inventory_delta.store_code,
            latest_inventory_delta.oh,
            latest_inventory_delta.oo,
            latest_inventory_delta.it,
            latest_inventory_delta.wip,
            latest_inventory_delta.channel
           FROM latest_inventory_delta
        UNION
         SELECT latest_inventory_raw.product_code,
            latest_inventory_raw.store_code,
            latest_inventory_raw.oh,
            latest_inventory_raw.oo,
            latest_inventory_raw.it,
            latest_inventory_raw.wip,
            latest_inventory_raw.channel
           FROM latest_inventory_raw
        ), mapping_table AS (
         SELECT psm.product_code AS new_product_code,
            psm.old_product_code
           FROM inventory_smart.product_supersession_mapping psm
          WHERE CURRENT_DATE >= psm.start_date AND CURRENT_DATE <= psm.end_date
          GROUP BY psm.product_code, psm.old_product_code
        ), final_base AS (
         SELECT COALESCE(m.new_product_code, a.product_code) AS product_code,
            a.store_code,
            a.channel,
            sum(COALESCE(a.it, 0)) AS it,
            sum(COALESCE(a.oh, 0)) AS oh,
            sum(COALESCE(a.oo, 0)) AS oo,
            sum(COALESCE(a.wip, 0)) AS wip
           FROM inventory_base a
             LEFT JOIN mapping_table m ON a.product_code::text = m.old_product_code::text
          GROUP BY (COALESCE(m.new_product_code, a.product_code)), a.store_code, a.channel
        UNION
         SELECT a.product_code AS product_code,
            a.store_code,
            a.channel,
            sum(COALESCE(a.it, 0)) AS it,
            sum(COALESCE(a.oh, 0)) AS oh,
            sum(COALESCE(a.oo, 0)) AS oo,
            sum(COALESCE(a.wip, 0)) AS wip
           FROM inventory_base a
             JOIN mapping_table m ON a.product_code::text = m.old_product_code::text
          GROUP BY a.product_code, a.store_code, a.channel
        )
 SELECT paf.l0_name,
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
    'eaches'::text AS pack_type,
    'E'::text AS type
   FROM final_base li
     JOIN global.distribution_centres dc ON li.store_code::text = dc.linked_store_code::text
     JOIN global.product_attributes_filter paf USING (product_code);