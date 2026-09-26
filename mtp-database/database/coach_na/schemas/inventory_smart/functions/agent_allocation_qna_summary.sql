--liquibase formatted sql
--changeset aniruddh.singh:create_agent_allocation_qna_summary_v1.2 runOnChange:true stripComments:false splitStatements:false context:create_agent_allocation_qna_summary_v1.1 labels:create_agent_allocation_qna_summary_v1.1
--comment: initial commit for create_agent_allocation_qna_summary_v1.2
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.agent_allocation_qna_summary(varchar[]);

CREATE OR REPLACE FUNCTION inventory_smart.agent_allocation_qna_summary(
  p_allocation_codes VARCHAR[]
)
RETURNS TABLE (
  allocation_code VARCHAR,
  l0_name VARCHAR,
  l1_name VARCHAR,
  l2_name VARCHAR,
  l4_name VARCHAR,
  l5_name VARCHAR,
  assortment_indicator VARCHAR,
  article_orig VARCHAR,
  color_code VARCHAR,
  style VARCHAR,
  intro_date DATE,
  factory_type VARCHAR,
  is_product_active BOOLEAN,
  ph_code VARCHAR,
  article_status_tag VARCHAR,
  product_description VARCHAR,
  channel VARCHAR,
  s0_name VARCHAR,
  s1_name VARCHAR,
  s2_name VARCHAR,
  s3_name VARCHAR,
  s4_name VARCHAR,
  is_store_active BOOLEAN,
  apparel_locations VARCHAR,
  asian_tourist_location VARCHAR,
  climate VARCHAR,
  concession_location VARCHAR,
  cust_type VARCHAR,
  fs_visibility_location VARCHAR,
  ftwear_boot_tier_locations VARCHAR,
  ftwear_capacity_location VARCHAR,
  ftwear_hot_weather_location VARCHAR,
  ftwear_key_itm_location VARCHAR,
  ftwear_location VARCHAR,
  ftwear_sneaker_tier_location VARCHAR,
  jewelry_location VARCHAR,
  locationindicator_orig VARCHAR,
  ly_assort_focus_location VARCHAR,
  men_concept_location VARCHAR,
  mens_ftwear_location VARCHAR,
  mens_location VARCHAR,
  msfrp_locations VARCHAR,
  store_opening_date DATE,
  pilot_location VARCHAR,
  primary_dc VARCHAR,
  resort_location VARCHAR,
  sap_site_id VARCHAR,
  signature_c_focus_location VARCHAR,
  store_type VARCHAR,
  sunglass_location VARCHAR,
  variable_prc_location VARCHAR,
  visual_merchandising_location VARCHAR,
  watch_location VARCHAR,
  wearables_location VARCHAR,
  zipcode VARCHAR,
  special_classification VARCHAR,
  store_description VARCHAR,
  store_name VARCHAR,
  poppy_location VARCHAR,
  latitude VARCHAR,
  longitude VARCHAR,
  store_category_type VARCHAR,
  store_size VARCHAR,
  sell_through_perc NUMERIC,
  lw_sales_units NUMERIC,
  wtd_sales_units NUMERIC,
  dc_oh NUMERIC,
  store_oh_it_oo NUMERIC,
  in_stock_perc NUMERIC,
  wos_oh_oo_it NUMERIC,
  last_8_week_sales NUMERIC,
  lw_margin_perc NUMERIC,
  lw_revenue NUMERIC,
  wos_oh NUMERIC,
  wos_oh_it NUMERIC,
  wos_oh_oo NUMERIC,
  store_oh NUMERIC,
  store_oo NUMERIC,
  store_it NUMERIC,
  store_oh_it NUMERIC,
  stockout NUMERIC,
  shortfall NUMERIC,
  excess NUMERIC,
  normal NUMERIC,
  lw_promo NUMERIC,
  lw_aur NUMERIC,
  wtd_revenue NUMERIC,
  wtd_margin NUMERIC,
  wtd_promo NUMERIC,
  wtd_aur NUMERIC,
  dc_oh_it_oo_can NUMERIC,
  dc_it NUMERIC,
  dc_oo NUMERIC,
  lw_aur_can NUMERIC,
  lw_margin_perc_can NUMERIC,
  lw_promo_can NUMERIC,
  lw_revenue_can NUMERIC,
  lw_sales_units_can NUMERIC,
  wtd_aur_can NUMERIC,
  wtd_margin_can NUMERIC,
  wtd_promo_can NUMERIC,
  wtd_revenue_can NUMERIC,
  wtd_sales_units_can NUMERIC,
  dc_it_can NUMERIC,
  dc_oh_can NUMERIC,
  dc_oh_it_oo NUMERIC,
  dc_oo_can NUMERIC,
  dc_it_us NUMERIC,
  dc_oh_us NUMERIC,
  dc_oh_it_oo_us NUMERIC,
  dc_oo_us NUMERIC,
  lw_aur_us NUMERIC,
  lw_margin_perc_us NUMERIC,
  lw_sales_units_us NUMERIC,
  wtd_aur_us NUMERIC,
  wtd_margin_us NUMERIC,
  wtd_promo_us NUMERIC,
  wtd_revenue_us NUMERIC,
  wtd_sales_units_us NUMERIC,
  wos_targeted NUMERIC,
  forecast_1week NUMERIC,
  forecast_4weeks NUMERIC,
  forecast_8weeks NUMERIC,
  l4_weeks_units NUMERIC,
  l8_weeks_units NUMERIC,
  stockout_flag VARCHAR,
  shortfall_flag VARCHAR,
  size_integrity VARCHAR,
  product_reach VARCHAR,
  size_level_allocation NUMERIC,
  article VARCHAR,
  inv_avai NUMERIC,
  inventory_source VARCHAR,
  demand NUMERIC,
  size_curve VARCHAR,
  split_profile VARCHAR,
  ros NUMERIC,
  min NUMERIC,
  max NUMERIC,
  oh NUMERIC,
  oo NUMERIC,
  it NUMERIC,
  wos NUMERIC,
  final_inv_available NUMERIC,
  aps NUMERIC,
  "order" NUMERIC,
  shipping_date DATE,
  store_grade VARCHAR,
  product_profile_selected VARCHAR,
  selected_store_count INT,
  store_group VARCHAR,
  original_forecast NUMERIC,
  constrained_forecast NUMERIC,
  max_supression_flag BOOLEAN,
  lt_forecast NUMERIC,
  updated_oh_oo_it NUMERIC,
  min_influenced_allocation NUMERIC,
  order_priority INT,
  allocation_strategy VARCHAR,
  dos NUMERIC,
  store VARCHAR,
  size VARCHAR,
  dc_code TEXT,
  pack_type_id TEXT,
  pack_level_allocation NUMERIC,
  pack_level_qty_available NUMERIC,
  uom_factor NUMERIC,
  units_in_packs NUMERIC,
  unit_multiplier INT,
  pack_type VARCHAR,
  pack_dc_oh NUMERIC,
  pack_dc_oo NUMERIC,
  pack_dc_it NUMERIC,
  net_capacity INT,
  net_qty_available NUMERIC,
  product_profile_name VARCHAR,
  product_profile_type VARCHAR,
  is_allocation_constrainted BOOLEAN,
  constraint_deviation NUMERIC,
  dc_priority NUMERIC,
  dc_transit_time NUMERIC,
  target_allocation NUMERIC,
  min_allocation NUMERIC,
  wos_allocation NUMERIC,
  excess_inventory_allocation BOOLEAN,
  is_underallocated BOOLEAN,
  min_max_influenced_allocation BOOLEAN,
  wos_influenced_allocation BOOLEAN,
  lost_sales NUMERIC,
  demand_completed BOOLEAN,
  overallocation_percentage_store_level NUMERIC,
  positive_constrant_impact_article_store_level NUMERIC,
  negative_constrant_impact_article_store_level NUMERIC,
  total_constraint_impac_article_store_level NUMERIC,
  overallocation_percentage_article_level NUMERIC,
  positive_constrant_impact_article_level NUMERIC,
  negative_constrant_impact_article_level NUMERIC,
  total_constrant_impact_article_level NUMERIC,
  max_limit BOOLEAN,
  dc_constraint BOOLEAN,
  is_store_capacity_breached BOOLEAN,
  can_dc_allocate BOOLEAN,
  can_pack_allocate BOOLEAN,
  is_dc_reallocatable BOOLEAN,
  upcoming_product_constrainted_article_pack_dc_level BOOLEAN,
  upcoming_product_constrainted_article_dc_level BOOLEAN,
  upcoming_product_constrainted_article_level BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
AS $$
WITH

/* Date bounds for partition pruning */
date_bounds AS MATERIALIZED (
  SELECT
    DATE_TRUNC('day', CURRENT_TIMESTAMP AT TIME ZONE 'America/Chicago') AT TIME ZONE 'America/Chicago' AS start_ts,
    DATE_TRUNC('day', CURRENT_TIMESTAMP AT TIME ZONE 'America/Chicago' + INTERVAL '1 day') AT TIME ZONE 'America/Chicago' AS end_ts
),

/* Core allocation data with optimized partition access */
allocation_base AS MATERIALIZED (
  SELECT
    pm.plan_code AS allocation_code,
    pm.name as plan_name,
    carfg.allocated_total AS size_level_allocation,
    carfg.article,
    carfg.inv_avai,
    carfg.inventory_source,
    carfg.demand,
    carfg.demand_type,
    carfg.size_curve,
    carfg.split_profile,
    carfg.ros,
    carfg.min,
    carfg.max,
    carfg.oh,
    carfg.oo,
    carfg.it,
    carfg.wos,
    carfg.final_inv_available,
    carfg.aps,
    carfg."order",
    (carfg.shipping_date)::date AS shipping_date,
    carfg.store_grade,
    carfg.product_profile_selected,
    carfg.selected_store_count,
    carfg.original_forecast,
    carfg.constrained_forecast,
    carfg.max_supression_flag,
    carfg.lt_forecast,
    carfg.updated_oh_oo_it,
    carfg.min_influenced_allocation,
    carfg.order_priority,
    carfg.allocation_strategy,
    carfg.dos,
    carfg.store,
    carfg.retail_size_cd AS size,
    carfg.pack_dc_allocation::jsonb AS pack_dc_allocation_json,
    ppm.name AS product_profile_name,
    ppm.special_classification AS product_profile_type
  FROM inventory_smart.create_allocation_result_flat_gurobi carfg
  JOIN inventory_smart.plan_master pm
    ON carfg.allocation_code = pm.plan_code
  LEFT JOIN inventory_smart.product_profile_master ppm
    ON carfg.product_profile_selected IS NOT NULL
   AND carfg.product_profile_selected != ''
   AND ppm.pp_code = carfg.product_profile_selected::int
  CROSS JOIN date_bounds db
  WHERE pm.status = 1
    AND (pm.plan_code = ANY(p_allocation_codes) OR pm.name = ANY(p_allocation_codes))
    AND carfg.pack_dc_allocation IS NOT NULL
    AND carfg.updated_at >= db.start_ts
    AND carfg.updated_at < db.end_ts
),

/* Extract unique identifiers for filtering */
unique_identifiers AS MATERIALIZED (
  SELECT DISTINCT
    article,
    store,
    dc_code,
    pack_type_id
  FROM (
    SELECT
      ab.article,
      ab.store,
      dc_pairs.key AS dc_code,
      pack_ids.elem AS pack_type_id
    FROM allocation_base ab
    CROSS JOIN LATERAL jsonb_each(ab.pack_dc_allocation_json) AS dc_pairs(key, value)
    CROSS JOIN LATERAL jsonb_array_elements_text(dc_pairs.value->'packs_allocated') AS pack_ids(elem)
  ) id_extract
),

/* Pre-filtered lookup tables */
product_hierarchy AS MATERIALIZED (
  SELECT DISTINCT paf.article, paf.l0_name, paf.l1_name, paf.l2_name
  FROM "global".product_attributes_filter paf
  WHERE paf.article IN (SELECT DISTINCT article FROM unique_identifiers)
),

store_list AS MATERIALIZED (
  SELECT DISTINCT store FROM allocation_base
),

uom_lookup AS MATERIALIZED (
  SELECT item_id, MAX(factor) AS factor
  FROM inventory_smart.uom
  WHERE item_id IN (SELECT DISTINCT article FROM unique_identifiers)
  GROUP BY item_id
),

sdau_lookup AS MATERIALIZED (
  SELECT
      article,
      dc_code::text AS dc_code,
      pack_type_id AS pack_type_id,
      pack_type as pack_type,
      MAX(oh) as pack_dc_oh,
      MAX(oo) as pack_dc_oo,
      MAX(it) as pack_dc_it,
      MAX(units_in_pack) AS units_in_pack
  FROM inventory_smart.sku_dc_available_units
  WHERE (article, dc_code::text, pack_type_id) IN (
    SELECT article, dc_code, pack_type_id FROM unique_identifiers
  )
  GROUP BY article, dc_code, pack_type_id, pack_type
),

/* Store inventory pre-aggregation */
store_inventory AS MATERIALIZED (
  SELECT
      li.store_code,
      COALESCE(SUM(li.oh), 0) + COALESCE(SUM(li.it), 0) + COALESCE(SUM(li.oo), 0) AS store_inv
  FROM inventory_smart.latest_inventory li
  WHERE li.store_code IN (SELECT store FROM store_list)
  GROUP BY 1
),

/* Store capacity pre-aggregation */
store_capacity AS MATERIALIZED (
  SELECT
      suc.store_code,
      suc.product_hierarchy,
      MAX(suc.unit_capacity) AS unit_capacity
  FROM inventory_smart.store_unit_capacity suc
  WHERE suc.store_code IN (SELECT store FROM store_list)
  GROUP BY 1, 2
),

/* DC-level pack allocation extraction */
dc_pack_allocations AS MATERIALIZED (
  SELECT
    ab.allocation_code,
    ab.size_level_allocation,
    ab.article,
    ab.inv_avai,
    ab.inventory_source,
    ab.demand,
    ab.size_curve,
    ab.split_profile,
    ab.ros,
    ab.min,
    ab.max,
    ab.oh,
    ab.oo,
    ab.it,
    ab.wos,
    ab.final_inv_available,
    ab.aps,
    ab."order",
    ab.shipping_date,
    ab.store_grade,
    ab.product_profile_selected,
    ab.selected_store_count,
    ab.original_forecast,
    ab.constrained_forecast,
    ab.max_supression_flag,
    ab.lt_forecast,
    ab.updated_oh_oo_it,
    ab.min_influenced_allocation,
    ab.order_priority,
    ab.allocation_strategy,
    ab.dos,
    ab.store,
    ab.size,
    ab.product_profile_name,
    ab.product_profile_type,
    dc_pairs.key AS dc_code,
    pack_ids.elem AS pack_type_id,
    COALESCE(q_alloc.elem::numeric, 0) AS qty_allocated,
    COALESCE(q_avail.elem::numeric, 0) AS qty_available
  FROM allocation_base ab
  CROSS JOIN LATERAL jsonb_each(ab.pack_dc_allocation_json) AS dc_pairs(key, value)
  CROSS JOIN LATERAL jsonb_array_elements_text(dc_pairs.value->'packs_allocated') WITH ORDINALITY AS pack_ids(elem, ord)
  LEFT  JOIN LATERAL jsonb_array_elements_text(dc_pairs.value->'packs_allocated_qty') WITH ORDINALITY AS q_alloc(elem, ord2)
         ON ord = ord2
  LEFT  JOIN LATERAL jsonb_array_elements_text(dc_pairs.value->'packs_available_qty') WITH ORDINALITY AS q_avail(elem, ord3)
         ON ord = ord3
),

/* Net capacity calculation components */
flat_allocations AS MATERIALIZED (
  SELECT
      ab.allocation_code,
      ab.article,
      ab.store AS store_code,
      SUM(x.elem::numeric) AS allocated_qty
  FROM allocation_base ab
  CROSS JOIN LATERAL jsonb_each(ab.pack_dc_allocation_json) AS dc(k, v)
  CROSS JOIN LATERAL jsonb_array_elements_text(v->'packs_allocated_qty') AS x(elem)
  GROUP BY 1, 2, 3
),

alloc_hierarchy AS MATERIALIZED (
  SELECT
      fa.allocation_code,
      fa.article,
      fa.store_code,
      ph.l0_name,
      ph.l1_name,
      ph.l2_name,
      SUM(fa.allocated_qty) AS allocated_qty
  FROM flat_allocations fa
  JOIN product_hierarchy ph ON fa.article = ph.article
  GROUP BY 1, 2, 3, 4, 5, 6
),

net_capacity_by_store AS MATERIALIZED (
  SELECT
      ah.allocation_code,
      ah.article,
      ah.store_code,
      (
        MAX(COALESCE(sc.unit_capacity, 0))
        - SUM(COALESCE(si.store_inv, 0))
        - SUM(COALESCE(ah.allocated_qty, 0))
      )::int AS net_capacity
  FROM alloc_hierarchy ah
  LEFT JOIN store_capacity sc
    ON sc.store_code = ah.store_code
   AND sc.product_hierarchy = concat(ah.l0_name, '-', ah.l1_name, '-', ah.l2_name)
  LEFT JOIN store_inventory si
    ON si.store_code = ah.store_code
  GROUP BY 1, 2, 3
),

/* DC-level net available calculation */
dc_net_available_base AS MATERIALIZED (
  SELECT
      dpa.article,
      dpa.dc_code,
      dpa.pack_type_id,
      AVG(COALESCE(dpa.qty_available, 0)) - SUM(COALESCE(dpa.qty_allocated, 0)) AS net_qty_base
  FROM dc_pack_allocations dpa
  GROUP BY 1, 2, 3
),

dc_net_available AS MATERIALIZED (
  SELECT 
      dnab.article,
      dnab.dc_code,
      dnab.pack_type_id,
      (dnab.net_qty_base * COALESCE(sl.units_in_pack::numeric, 1)) AS net_qty_available
  FROM dc_net_available_base dnab
  LEFT JOIN sdau_lookup sl
    ON sl.article = dnab.article
   AND sl.dc_code = dnab.dc_code
   AND sl.pack_type_id = dnab.pack_type_id
),

/* Size-level derived metrics */
size_metrics AS MATERIALIZED (
  SELECT
      dpa.allocation_code,
      dpa.article,
      dpa.store,
      dpa.size,
      dpa.dc_code,
      dpa.pack_type_id,
      LEAST(GREATEST(dpa.demand - dpa.updated_oh_oo_it, dpa.min, 0), dpa.max) AS target_allocation,
      LEAST(dpa.size_level_allocation, GREATEST(0, dpa.min - dpa.updated_oh_oo_it)) AS min_allocation,
      GREATEST(0, dpa.size_level_allocation - GREATEST(0, dpa.min - dpa.updated_oh_oo_it)) AS wos_allocation,
      (dpa.size_level_allocation > LEAST(GREATEST(dpa.demand - dpa.updated_oh_oo_it, dpa.min, 0), dpa.max)) AS excess_inventory_allocation,
      (dpa.size_level_allocation < LEAST(GREATEST(dpa.demand - dpa.updated_oh_oo_it, dpa.min, 0), dpa.max)) AS is_underallocated,
      GREATEST(dpa.demand - dpa.updated_oh_oo_it - dpa.size_level_allocation, 0) AS lost_sales,
      (dpa.size_level_allocation <> LEAST(GREATEST(dpa.demand - dpa.updated_oh_oo_it, dpa.min, 0), dpa.max)) AS is_allocation_constrainted,
      (dpa.size_level_allocation - LEAST(GREATEST(dpa.demand - dpa.updated_oh_oo_it, dpa.min, 0), dpa.max)) AS constraint_deviation
  FROM dc_pack_allocations dpa
),

/* Store-level constraint impact */
store_constraint_stats AS MATERIALIZED (
  SELECT
      sm.allocation_code,
      sm.article,
      sm.store,
      COUNT(*) AS total_combos,
      COUNT(*) FILTER (WHERE sm.excess_inventory_allocation AND sm.is_allocation_constrainted) AS pos_and_alloc_cnt,
      COUNT(*) FILTER (WHERE sm.is_underallocated AND sm.is_allocation_constrainted) AS neg_cnt,
      BOOL_AND(NOT COALESCE(sm.is_allocation_constrainted, FALSE)) AS demand_completed
  FROM size_metrics sm
  GROUP BY 1, 2, 3
),

/* Article-level constraint impact */
article_constraint_stats AS MATERIALIZED (
  SELECT
      sm.allocation_code,
      sm.article,
      COUNT(*) AS total_combos_article,
      COUNT(*) FILTER (WHERE sm.excess_inventory_allocation AND sm.is_allocation_constrainted) AS pos_and_alloc_cnt_article,
      COUNT(*) FILTER (WHERE sm.is_underallocated AND sm.is_allocation_constrainted) AS neg_cnt_article
  FROM size_metrics sm
  GROUP BY 1, 2
),

/* DC-level aggregate flags */
dc_constraint_flags AS MATERIALIZED (
  SELECT
      sm.allocation_code,
      sm.article,
      sm.dc_code,
      SUM(dcna.net_qty_available) AS sum_net_qty_available,
      BOOL_AND(COALESCE(sm.is_allocation_constrainted, FALSE)) AS all_constrained_dc,
      SUM(COALESCE(dpa.oh, 0) + COALESCE(dpa.it, 0)) AS sum_it_oo_dc
  FROM size_metrics sm
  JOIN dc_pack_allocations dpa
    ON dpa.allocation_code = sm.allocation_code AND dpa.article = sm.article
   AND dpa.store = sm.store AND dpa.size = sm.size AND dpa.dc_code = sm.dc_code AND dpa.pack_type_id = sm.pack_type_id
  LEFT JOIN dc_net_available dcna
    ON dcna.article = sm.article AND dcna.dc_code = sm.dc_code AND dcna.pack_type_id = sm.pack_type_id
  GROUP BY 1, 2, 3
),

/* Pack-DC-level aggregate flags */
pack_dc_constraint_flags AS MATERIALIZED (
  SELECT
      sm.allocation_code,
      sm.article,
      sm.dc_code,
      sm.pack_type_id,
      SUM(dcna.net_qty_available) AS sum_net_qty_available,
      BOOL_AND(COALESCE(sm.is_allocation_constrainted, FALSE)) AS all_constrained_pack_dc,
      SUM(COALESCE(dpa.oh, 0) + COALESCE(dpa.it, 0)) AS sum_it_oo_pack_dc
  FROM size_metrics sm
  JOIN dc_pack_allocations dpa
    ON dpa.allocation_code = sm.allocation_code AND dpa.article = sm.article
   AND dpa.store = sm.store AND dpa.size = sm.size AND dpa.dc_code = sm.dc_code AND dpa.pack_type_id = sm.pack_type_id
  LEFT JOIN dc_net_available dcna
    ON dcna.article = sm.article AND dcna.dc_code = sm.dc_code AND dcna.pack_type_id = sm.pack_type_id
  GROUP BY 1, 2, 3, 4
),

/* Article-level aggregate flags */
article_constraint_flags AS MATERIALIZED (
  SELECT
      sm.allocation_code,
      sm.article,
      BOOL_AND(COALESCE(sm.is_allocation_constrainted, FALSE)) AS all_constrained_article,
      SUM(COALESCE(dpa.oh, 0) + COALESCE(dpa.it, 0)) AS sum_it_oo_article,
      BOOL_OR(NOT COALESCE(sm.is_allocation_constrainted, FALSE)) AS has_any_unconstrained_article
  FROM size_metrics sm
  JOIN dc_pack_allocations dpa
    ON dpa.allocation_code = sm.allocation_code AND dpa.article = sm.article
   AND dpa.store = sm.store AND dpa.size = sm.size AND dpa.dc_code = sm.dc_code AND dpa.pack_type_id = sm.pack_type_id
  GROUP BY 1, 2
)

SELECT DISTINCT
  dpa.allocation_code,
  pm2.l0_name,
  pm2.l1_name,
  pm2.l2_name,
  pm2.l4_name,
  pm2.l5_name,
  pm2.assortment_indicator,
  pm2.article_orig,
  pm2.color_code,
  pm2.style,
  pm2.intro_date,
  pm2.factory_type,
  pm2.active AS is_product_active,
  pm2.ph_code,
  pm2.article_status_tag,
  pm2.product_description,
  pm2.channel,
  saf.s0_name,
  saf.s1_name,
  saf.s2_name,
  saf.s3_name,
  saf.s4_name,
  saf.active AS is_store_active,
  saf.apparel_locations,
  saf.asian_tourist_location,
  saf.climate,
  saf.concession_location,
  saf.cust_type,
  saf.fs_visibility_location,
  saf.ftwear_boot_tier_locations,
  saf.ftwear_capacity_location,
  saf.ftwear_hot_weather_location,
  saf.ftwear_key_itm_location,
  saf.ftwear_location,
  NULL::varchar AS ftwear_sneaker_tier_location,
  saf.jewelry_location,
  saf.locationindicator_orig,
  saf.ly_assort_focus_location,
  saf.men_concept_location,
  saf.mens_ftwear_location,
  saf.mens_location,
  saf.msfrp_locations,
  saf.open_date AS store_opening_date,
  saf.pilot_location,
  saf.primary_dc,
  saf.resort_location,
  saf.sap_site_id,
  saf.signature_c_focus_location,
  saf.store_type,
  saf.sunglass_location,
  saf.variable_prc_location,
  saf.visual_merchandising_location,
  saf.watch_location,
  saf.wearables_location,
  saf.zipcode,
  saf.special_classification,
  saf.store_description,
  saf.store_name,
  saf.poppy_location,
  saf.latitude,
  saf.longitude,
  saf.category_type AS store_category_type,
  saf.store_size,
  aid.sell_through_perc,
  aid.lw_sales_units,
  aid.wtd_sales_units,
  aid.dc_oh,
  aid.store_oh_it_oo,
  aid.in_stock_perc,
  aid.wos_oh_oo_it,
  aid.last_8_week_sales,
  aid.lw_margin_perc,
  aid.lw_revenue,
  aid.wos_oh,
  aid.wos_oh_it,
  aid.wos_oh_oo,
  aid.store_oh,
  aid.store_oo,
  aid.store_it,
  aid.store_oh_it,
  aid.stockout,
  aid.shortfall,
  aid.excess,
  aid.normal,
  aid.lw_promo,
  aid.lw_aur,
  aid.wtd_revenue,
  aid.wtd_margin,
  aid.wtd_promo,
  aid.wtd_aur,
  aid.dc_oh_it_oo_can,
  aid.dc_it,
  aid.dc_oo,
  aid.lw_aur_can,
  aid.lw_margin_perc_can,
  aid.lw_promo_can,
  aid.lw_revenue_can,
  aid.lw_sales_units_can,
  aid.wtd_aur_can,
  aid.wtd_margin_can,
  aid.wtd_promo_can,
  aid.wtd_revenue_can,
  aid.wtd_sales_units_can,
  aid.dc_it_can,
  aid.dc_oh_can,
  aid.dc_oh_it_oo,
  aid.dc_oo_can,
  aid.dc_it_us,
  dc_oh_us,
  dc_oh_it_oo_us,
  dc_oo_us,
  lw_aur_us,
  lw_margin_perc_us,
  lw_sales_units_us,
  wtd_aur_us,
  wtd_margin_us,
  wtd_promo_us,
  wtd_revenue_us,
  wtd_sales_units_us,
  wos_targeted,
  aid.forecast_1week,
  aid.forecast_4weeks,
  aid.forecast_8weeks,
  aid.l4_weeks_units,
  aid.l8_weeks_units,
  aid.stockout_flag,
  aid.shortfall_flag,
  aid.size_integrity,
  aid.product_reach,

  dpa.size_level_allocation,
  dpa.article,
  dpa.inv_avai,
  dpa.inventory_source,
  dpa.demand,
  dpa.size_curve,
  dpa.split_profile,
  dpa.ros,
  dpa.min,
  dpa.max,
  dpa.oh,
  dpa.oo,
  dpa.it,
  dpa.wos,
  dpa.final_inv_available,
  dpa.aps,
  dpa."order",
  dpa.shipping_date,
  dpa.store_grade,
  dpa.product_profile_selected,
  dpa.selected_store_count,
  aid.store_group,
  dpa.original_forecast,
  dpa.constrained_forecast,
  dpa.max_supression_flag,
  dpa.lt_forecast,
  dpa.updated_oh_oo_it,
  CASE
    WHEN dpa.min_influenced_allocation IS TRUE  THEN 1::numeric
    WHEN dpa.min_influenced_allocation IS FALSE THEN 0::numeric
    ELSE NULL::numeric
  END AS min_influenced_allocation,
  dpa.order_priority,
  dpa.allocation_strategy,
  dpa.dos,
  dpa.store,
  dpa.size,
  dpa.dc_code AS dc_code,
  dpa.pack_type_id AS pack_type_id,
  dpa.qty_allocated AS pack_level_allocation,
  dpa.qty_available AS pack_level_qty_available,
  COALESCE(uom.factor::numeric, 1) uom_factor,
  COALESCE(sl.units_in_pack::numeric, 0) units_in_packs,
  GREATEST(
    COALESCE(uom.factor::numeric, 0),
    COALESCE(sl.units_in_pack::numeric, 0),
    1::numeric
  )::int AS unit_multiplier,
  sl.pack_type,
  sl.pack_dc_oh,
  sl.pack_dc_oo,
  sl.pack_dc_it,
  ncbs.net_capacity,
  dcna.net_qty_available,
  dpa.product_profile_name,
  dpa.product_profile_type,
  sm.is_allocation_constrainted,
  sm.constraint_deviation,
  NULL::numeric AS dc_priority,
  NULL::numeric AS dc_transit_time,
  sm.target_allocation,
  sm.min_allocation,
  sm.wos_allocation,
  sm.excess_inventory_allocation,
  sm.is_underallocated,
  (sm.min_allocation >= sm.wos_allocation) AS min_max_influenced_allocation,
  (sm.wos_allocation > sm.min_allocation) AS wos_influenced_allocation,
  sm.lost_sales,
  scs.demand_completed,
  CASE WHEN scs.total_combos > 0 THEN (scs.pos_and_alloc_cnt::numeric / scs.total_combos) * 100 ELSE 0 END AS overallocation_percentage_store_level,
  CASE WHEN scs.total_combos > 0 THEN (scs.pos_and_alloc_cnt::numeric / scs.total_combos) * 100 ELSE 0 END AS positive_constrant_impact_article_store_level,
  CASE WHEN scs.total_combos > 0 THEN (scs.neg_cnt::numeric / scs.total_combos) * 100 ELSE 0 END AS negative_constrant_impact_article_store_level,
  CASE WHEN scs.total_combos > 0 THEN ((scs.pos_and_alloc_cnt + scs.neg_cnt)::numeric / scs.total_combos) * 100 ELSE 0 END AS total_constraint_impac_article_store_level,
  CASE WHEN acs.total_combos_article > 0 THEN (acs.pos_and_alloc_cnt_article::numeric / acs.total_combos_article) * 100 ELSE 0 END AS overallocation_percentage_article_level,
  CASE WHEN acs.total_combos_article > 0 THEN (acs.pos_and_alloc_cnt_article::numeric / acs.total_combos_article) * 100 ELSE 0 END AS positive_constrant_impact_article_level,
  CASE WHEN acs.total_combos_article > 0 THEN (acs.neg_cnt_article::numeric / acs.total_combos_article) * 100 ELSE 0 END AS negative_constrant_impact_article_level,
  CASE WHEN acs.total_combos_article > 0 THEN ((acs.pos_and_alloc_cnt_article + acs.neg_cnt_article)::numeric / acs.total_combos_article) * 100 ELSE 0 END AS total_constrant_impact_article_level,
  (dpa.demand <= dpa.max AND dpa.size_level_allocation >= dpa.min AND dpa.size_level_allocation <= dpa.max AND sm.is_allocation_constrainted) AS max_limit,
  (sm.is_allocation_constrainted AND COALESCE(dcna.net_qty_available, 0) <= 0) AS dc_constraint,
  (COALESCE(ncbs.net_capacity, 0) < 0) AS is_store_capacity_breached,
  (COALESCE(dcf.sum_net_qty_available, 0) > 0 AND COALESCE(acf.has_any_unconstrained_article, FALSE)) AS can_dc_allocate,
  (COALESCE(pdcf.sum_net_qty_available, 0) > 0 AND COALESCE(acf.has_any_unconstrained_article, FALSE)) AS can_pack_allocate,
  (COALESCE(dcf.sum_net_qty_available, 0) > 0) AS is_dc_reallocatable,
  (COALESCE(pdcf.all_constrained_pack_dc, FALSE) AND COALESCE(pdcf.sum_it_oo_pack_dc, 0) > 0)::boolean AS upcoming_product_constrainted_article_pack_dc_level,
  (COALESCE(dcf.all_constrained_dc, FALSE) AND COALESCE(dcf.sum_it_oo_dc, 0) > 0)::boolean AS upcoming_product_constrainted_article_dc_level,
  (COALESCE(acf.all_constrained_article, FALSE) AND COALESCE(acf.sum_it_oo_article, 0) > 0)::boolean AS upcoming_product_constrainted_article_level
FROM dc_pack_allocations dpa
JOIN inventory_smart.ph_master pm2
  ON dpa.article = pm2.article
JOIN "global".store_attributes_filter saf
  ON dpa.store = saf.store_code
JOIN inventory_smart.article_inventory_dashboard aid
  ON dpa.article = aid.article
 AND dpa.store   = aid.store_code
LEFT JOIN uom_lookup uom
  ON dpa.article = uom.item_id
LEFT JOIN sdau_lookup sl
  ON dpa.article      = sl.article
 AND dpa.dc_code      = sl.dc_code
 AND dpa.pack_type_id = sl.pack_type_id
LEFT JOIN net_capacity_by_store ncbs
  ON ncbs.allocation_code = dpa.allocation_code
 AND ncbs.article        = dpa.article
 AND ncbs.store_code     = dpa.store
LEFT JOIN dc_net_available dcna
  ON dcna.article      = dpa.article
 AND dcna.dc_code      = dpa.dc_code
 AND dcna.pack_type_id = dpa.pack_type_id
LEFT JOIN size_metrics sm
  ON sm.allocation_code = dpa.allocation_code
 AND sm.article         = dpa.article
 AND sm.store           = dpa.store
 AND sm.size            = dpa.size
 AND sm.dc_code         = dpa.dc_code
 AND sm.pack_type_id    = dpa.pack_type_id
LEFT JOIN store_constraint_stats scs
  ON scs.allocation_code = dpa.allocation_code
 AND scs.article         = dpa.article
 AND scs.store           = dpa.store
LEFT JOIN article_constraint_stats acs
  ON acs.allocation_code = dpa.allocation_code
 AND acs.article         = dpa.article
LEFT JOIN dc_constraint_flags dcf
  ON dcf.allocation_code = dpa.allocation_code
 AND dcf.article         = dpa.article
 AND dcf.dc_code         = dpa.dc_code
LEFT JOIN pack_dc_constraint_flags pdcf
  ON pdcf.allocation_code = dpa.allocation_code
 AND pdcf.article         = dpa.article
 AND pdcf.dc_code         = dpa.dc_code
 AND pdcf.pack_type_id    = dpa.pack_type_id
LEFT JOIN article_constraint_flags acf
  ON acf.allocation_code = dpa.allocation_code
 AND acf.article         = dpa.article;

$$;