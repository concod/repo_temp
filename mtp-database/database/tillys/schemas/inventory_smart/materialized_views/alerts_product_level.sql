--liquibase formatted sql
--changeset gauri.nair@impactanalytics.co:alerts_product_level_tillys_view runOnChange:false stripComments:false splitStatements:false context:zdt-views labels:MTP-1
--comment: initial changeset for alerts_product_level_tillys_view
--rollback: SELECT 1

--No dependency handling for this mv as it is recreated daily as part of kpi config. 
--No dependency allowed unless handled separately.
DROP MATERIALIZED VIEW IF EXISTS inventory_smart.alerts_product_level CASCADE;
CREATE MATERIALIZED VIEW inventory_smart.alerts_product_level AS
  SELECT
    alerts_product_level_version.article,
    alerts_product_level_version.product_code,
    alerts_product_level_version.l0_name,
    alerts_product_level_version.l1_name,
    alerts_product_level_version.l2_name,
    alerts_product_level_version.l3_name,
    alerts_product_level_version.l4_name,
    alerts_product_level_version.channel,
    alerts_product_level_version.excs_flg,
    alerts_product_level_version.shrtfl_flg,
    alerts_product_level_version.stckout_flg,
    alerts_product_level_version.excess,
    alerts_product_level_version.shortfall,
    alerts_product_level_version.stockout,
    alerts_product_level_version.normal,
    alerts_product_level_version.oh,
    alerts_product_level_version.it,
    alerts_product_level_version.oo,
    alerts_product_level_version.lw_qty,
    alerts_product_level_version.lw_revenue,
    alerts_product_level_version.c,
    alerts_product_level_version.promo_percentage,
    alerts_product_level_version.wos,
    alerts_product_level_version.size_integrity,
    alerts_product_level_version.week_to_date_sales,
    alerts_product_level_version.last_day_sales,
    alerts_product_level_version.oh_dc,
    alerts_product_level_version.sales_1_ago,
    alerts_product_level_version.sales_2_ago,
    alerts_product_level_version.sales_3_ago,
    alerts_product_level_version.sales_4_ago,
    alerts_product_level_version.aur,
    alerts_product_level_version.clearance_alert_flg,
    alerts_product_level_version.newly_launched_alert_flg,
    alerts_product_level_version.number_of_allocations,
    alerts_product_level_version.wos_oh,
    alerts_product_level_version.wos_oh_it,
    alerts_product_level_version.tot_inv,
    alerts_product_level_version.launch_date,
    alerts_product_level_version.recent_deviation_flg,
    alerts_product_level_version.repeat_deviation_flg,
    alerts_product_level_version.new_deviation_flg,
    alerts_product_level_version.style_name,
    alerts_product_level_version.excs_is_resolved,
    alerts_product_level_version.shrtfl_is_resolved,
    alerts_product_level_version.stckout_is_resolved,
    alerts_product_level_version.style_color_desc,
    alerts_product_level_version.color_id_name,
    alerts_product_level_version.price_status,
    alerts_product_level_version.vendor,
    alerts_product_level_version.brand,
    alerts_product_level_version."comments",
    alerts_product_level_version.silhouette,
    alerts_product_level_version.lw_margin,
    alerts_product_level_version.lw_aur
  FROM inventory_smart.alerts_product_level_version
  WHERE alerts_product_level_version.version_code =
    global.get_table_version('inventory_smart.alerts_product_level_version'::text);

--changeset linu.nazil:alerts_product_level_v2 runOnChange:true stripComments:false splitStatements:false context:zdt-views labels:MTP-2_v5
--comment: initial changeset for alerts_product_level_v2
CREATE UNIQUE INDEX IF NOT EXISTS alerts_product_level_unique_idx ON inventory_smart.alerts_product_level
USING btree (product_code);
