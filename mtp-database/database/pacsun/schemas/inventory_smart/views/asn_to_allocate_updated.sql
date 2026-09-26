--liquibase formatted sql
--changeset bhaskar.reddy@impactanalytics.co:live_asn_to_allocate_table_v7 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-43729_new
--comment: updated to exclude asn's with handling type = ECOMM 
--rollback: SELECT 1

DROP VIEW IF EXISTS inventory_smart.asn_to_allocate_updated;

CREATE OR REPLACE VIEW inventory_smart.asn_to_allocate_updated
AS WITH master_rows AS (
         SELECT asn_to_allocate_alert.asn_id,
            asn_to_allocate_alert.article,
            asn_to_allocate_alert.l0_name,
            asn_to_allocate_alert.l1_name,
            asn_to_allocate_alert.l2_name,
            asn_to_allocate_alert.l3_id_name,
            asn_to_allocate_alert.brand,
            asn_to_allocate_alert.l3_name,
            asn_to_allocate_alert.l4_name,
            asn_to_allocate_alert.style_color_description,
            asn_to_allocate_alert.handling_type,
            asn_to_allocate_alert.fit,
            asn_to_allocate_alert.ladder,
            asn_to_allocate_alert.sizes_mat,
            asn_to_allocate_alert.receiver_number,
            asn_to_allocate_alert.asn_qty,
            asn_to_allocate_alert.delivery_date,
            asn_to_allocate_alert.vi_date,
            asn_to_allocate_alert.ata_is_resolved,
            asn_to_allocate_alert.at_is_resolved,
            asn_to_allocate_alert.forecast_over_target_wos,
            asn_to_allocate_alert.store_count_asn
           FROM inventory_smart.asn_to_allocate_alert
           WHERE handling_type <> 'ECOMM'
        ), delta_rows AS (
         SELECT dl.asn_code AS asn_id,
            dl.article,
            paf.l0_name,
            paf.l1_name,
            paf.l2_name,
            paf.l3_id_name,
            paf.brand,
            paf.l3_name,
            paf.l4_name,
            paf.style_color_description,
            dl.handling_type,
            paf.fit,
            paf.ladder,
            string_agg(DISTINCT paf.size::text, ', '::text ORDER BY (paf.size::text)) AS sizes_mat,
            max(dl.receiver_number) as receiver_number,
            sum(dl.available_qty) AS asn_qty,
            dl.requirement_date AS delivery_date,
            dl.vi_date,
            0 AS ata_is_resolved,
            0 AS at_is_resolved,
            0::double precision as forecast_over_target_wos,
            0 as store_count_asn
           FROM inventory_smart.latest_asn_delta dl
             JOIN global.product_master pm ON dl.pack_type_id::text = pm.product_code::text
             JOIN global.product_attributes_filter paf ON dl.pack_type_id::text = paf.product_code::text
          WHERE ((dl.requirement_date IS NOT NULL and dl.requirement_date != '1900-01-01') OR dl.vi_date >= CURRENT_DATE AND dl.vi_date <= (CURRENT_DATE + '15 days'::interval)) AND dl.available_qty > 0 AND pm.active IS TRUE AND active_asn_flag is TRUE
          GROUP BY dl.asn_code, dl.article, paf.l0_name, paf.l1_name, paf.l2_name, paf.l3_id_name, paf.brand, paf.l3_name, paf.l4_name, paf.style_color_description, dl.handling_type, paf.fit, paf.ladder, dl.requirement_date, dl.vi_date
        ), master_excluding_delta AS (
         SELECT m.asn_id,
            m.article,
            m.l0_name,
            m.l1_name,
            m.l2_name,
            m.l3_id_name,
            m.brand,
            m.l3_name,
            m.l4_name,
            m.style_color_description,
            m.handling_type,
            m.fit,
            m.ladder,
            m.sizes_mat,
            m.receiver_number,
            m.asn_qty,
            m.delivery_date,
            m.vi_date,
            m.ata_is_resolved,
            m.at_is_resolved,
            m.forecast_over_target_wos,
            m.store_count_asn
           FROM master_rows m
             LEFT JOIN delta_rows d ON m.asn_id::text = d.asn_id AND m.article::text = d.article::text
          WHERE d.asn_id IS NULL AND d.article IS NULL
        )
 SELECT master_excluding_delta.asn_id,
    master_excluding_delta.article,
    master_excluding_delta.l0_name,
    master_excluding_delta.l1_name,
    master_excluding_delta.l2_name,
    master_excluding_delta.l3_id_name,
    master_excluding_delta.brand,
    master_excluding_delta.l3_name,
    master_excluding_delta.l4_name,
    master_excluding_delta.style_color_description,
    master_excluding_delta.handling_type,
    master_excluding_delta.fit,
    master_excluding_delta.ladder,
    master_excluding_delta.sizes_mat,
    master_excluding_delta.receiver_number,
    master_excluding_delta.asn_qty,
    master_excluding_delta.delivery_date,
    master_excluding_delta.vi_date,
    master_excluding_delta.ata_is_resolved,
    master_excluding_delta.at_is_resolved,
    master_excluding_delta.forecast_over_target_wos,
    master_excluding_delta.store_count_asn
   FROM master_excluding_delta
UNION ALL
 SELECT delta_rows.asn_id,
    delta_rows.article,
    delta_rows.l0_name,
    delta_rows.l1_name,
    delta_rows.l2_name,
    delta_rows.l3_id_name,
    delta_rows.brand,
    delta_rows.l3_name,
    delta_rows.l4_name,
    delta_rows.style_color_description,
    delta_rows.handling_type,
    delta_rows.fit,
    delta_rows.ladder,
    delta_rows.sizes_mat,
    delta_rows.receiver_number,
    delta_rows.asn_qty,
    delta_rows.delivery_date,
    delta_rows.vi_date,
    delta_rows.ata_is_resolved,
    delta_rows.at_is_resolved,
    delta_rows.forecast_over_target_wos,
    delta_rows.store_count_asn
   FROM delta_rows;