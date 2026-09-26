--liquibase formatted sql
--changeset aniruddh.singh:create_agent_allocation_qna_summary_v1.6 runOnChange:true stripComments:false splitStatements:false context:create_agent_allocation_qna_summary_v1.1 labels:create_agent_allocation_qna_summary_v1.1
--comment: Updated to accept array of allocation codes v1.6
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.agent_allocation_qna_summary(varchar);
DROP FUNCTION IF EXISTS inventory_smart.agent_allocation_qna_summary(varchar[]);

CREATE OR REPLACE FUNCTION inventory_smart.agent_allocation_qna_summary(
  p_allocation_codes VARCHAR[]
)
RETURNS TABLE (
  allocation_code VARCHAR,
  article VARCHAR,
  store VARCHAR,
  size VARCHAR,
  dc_code TEXT,
  pack_type_id TEXT,
  pack_level_allocation NUMERIC,
  pack_level_qty_available NUMERIC,
  qty_allocated_cb NUMERIC,
  qty_available_cb NUMERIC,
  unit_multiplier_cb INT,
  net_qty_available_cb NUMERIC,
  unit_multiplier INT,
  net_capacity INT,
  size_level_allocation NUMERIC,
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
  store_group TEXT,
  original_forecast NUMERIC,
  constrained_forecast NUMERIC,
  max_supression_flag BOOLEAN,
  lt_forecast NUMERIC,
  updated_oh_oo_it NUMERIC,
  min_influenced_allocation NUMERIC,
  order_priority INT,
  allocation_strategy VARCHAR,
  dos NUMERIC,
  product_profile_name VARCHAR,
  product_profile_type VARCHAR,
  is_allocation_constrainted BOOLEAN,
  constraint_deviation NUMERIC,
  target_allocation NUMERIC,
  excess_inventory_allocation BOOLEAN,
  is_underallocated BOOLEAN,
  wos_allocation NUMERIC,
  min_allocation NUMERIC,
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
  upcoming_product_constrainted_article_pack_dc_level BOOLEAN,
  upcoming_product_constrainted_article_dc_level BOOLEAN,
  upcoming_product_constrainted_article_level BOOLEAN,
  is_dc_reallocatable BOOLEAN,
  dc_transit_time NUMERIC,
  dc_priority INT,
  l0_name VARCHAR,
  l1_name VARCHAR,
  l2_name VARCHAR,
  l3_name VARCHAR,
  l4_name VARCHAR,
  l5_name VARCHAR,
  primary_trait_id VARCHAR,
  primary_trait_desc VARCHAR,
  style VARCHAR,
  product_type VARCHAR,
  ph_code VARCHAR,
  product_description VARCHAR,
  article_clearance_flag VARCHAR,
  product_channel VARCHAR,
  article_launch_date DATE,
  article_item_status VARCHAR,
  article_status_tag VARCHAR,
  store_channel VARCHAR,
  store_oh NUMERIC,
  store_it NUMERIC,
  store_oo NUMERIC,
  store_total_inventory NUMERIC,
  promo_percentage NUMERIC,
  wos_oh NUMERIC,
  wos_oh_oo NUMERIC,
  wos_oh_oo_it NUMERIC,
  wos_oh_it NUMERIC,
  sell_through_perc NUMERIC,
  style_description VARCHAR,
  clearance_start_date DATE,
  price NUMERIC,
  msrp NUMERIC,
  l4w_units NUMERIC,
  l4w_revenue NUMERIC,
  l8w_units NUMERIC,
  l6m_units NUMERIC,
  discount NUMERIC,
  dc_wos_oh_oo_it NUMERIC,
  dc_wos_oh_oo NUMERIC,
  dc_wos_oh NUMERIC,
  ata_eaches NUMERIC,
  ata_packs NUMERIC,
  ata NUMERIC,
  oh_dc NUMERIC,
  it_dc NUMERIC,
  oo_dc NUMERIC,
  in_stock_count INT,
  instock_perc NUMERIC,
  dc_instock INT,
  dc_instock_count INT,
  dc_instock_total_count INT,
  dc_instock_perc NUMERIC,
  in_stock_dc_ata_count INT,
  in_stock_dc_ata_total_count INT,
  in_stock_ata NUMERIC,
  wtd_units NUMERIC,
  w2_units NUMERIC,
  w3_units NUMERIC,
  w4_units NUMERIC,
  w5_units NUMERIC,
  w6_units NUMERIC,
  w7_units NUMERIC,
  w8_units NUMERIC,
  twos NUMERIC,
  article_alert_flag VARCHAR,
  product_tag VARCHAR,
  store_description VARCHAR,
  region VARCHAR,
  country VARCHAR,
  state VARCHAR,
  district VARCHAR,
  city VARCHAR,
  climate VARCHAR,
  close_date DATE,
  s0_name VARCHAR,
  like_store_id VARCHAR,
  s1_name VARCHAR,
  s2_name VARCHAR,
  s3_name VARCHAR,
  s4_name VARCHAR,
  store_status VARCHAR,
  store_tier VARCHAR,
  zipcode VARCHAR,
  saf_store_name VARCHAR,
  open_date DATE,
  saf_channel VARCHAR,
  saf_active BOOLEAN,
  saf_special_classification VARCHAR
)
LANGUAGE sql
SECURITY DEFINER
AS $$

WITH product_mapping_store_dc AS (
  SELECT DISTINCT store_code, dc_code, mapping_code
  FROM global.product_mapping_store_dc
  WHERE store_code IS NOT NULL
    AND dc_code    IS NOT NULL
    AND is_active = TRUE
),
dc_transit_time_mapping AS (
  SELECT mapping_code, transit_time, 1 as priority
  FROM inventory_smart.dc_transit_time_mapping
),
dc_ttp AS MATERIALIZED (
  SELECT
    pmsd.store_code,
    pmsd.dc_code,
    MAX(dttm.transit_time) AS dc_transit_time,
    MAX(dttm.priority)     AS dc_priority
  FROM product_mapping_store_dc pmsd
  LEFT JOIN dc_transit_time_mapping dttm
    ON dttm.mapping_code = pmsd.mapping_code
  GROUP BY 1, 2
),

bounds AS MATERIALIZED (
  SELECT
    date_trunc('day', now() AT TIME ZONE 'America/Chicago') AT TIME ZONE 'America/Chicago' AS start_ts,
    (date_trunc('day', now() AT TIME ZONE 'America/Chicago') + interval '1 day') AT TIME ZONE 'America/Chicago' AS end_ts
),

/* Base rows from CARFG (plan + size + pack-json) */
base AS MATERIALIZED (
  SELECT
    pm.plan_code                       AS allocation_code,
    carfg.allocated_total              AS size_level_allocation,
    carfg.article,
    carfg.inv_avai,
    carfg.inventory_source,
    carfg.demand,
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
    (carfg.shipping_date)::date        AS shipping_date,
    carfg.store_grade,
    carfg.product_profile_selected,
    carfg.selected_store_count,
    (carfg.selected_store_group_names)::text AS store_group,
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
    carfg.retail_size_cd               AS size,
    carfg.pack_dc_allocation::jsonb    AS j
  FROM inventory_smart.create_allocation_result_flat_gurobi carfg
  JOIN inventory_smart.plan_master pm
    ON carfg.allocation_code = pm.plan_code
  JOIN bounds b ON TRUE
  WHERE (pm.plan_code = ANY(p_allocation_codes) OR pm.name = ANY(p_allocation_codes))
    AND carfg.updated_at >= b.start_ts
    AND carfg.updated_at <  b.end_ts
    AND carfg.pack_dc_allocation IS NOT NULL
),

/* Expand pack/DC JSON arrays */
dc_level AS MATERIALIZED (
  SELECT
    b.*,
    dc_pairs.key::text  AS dc_code,
    dc_pairs.value      AS dc_payload
  FROM base b
  CROSS JOIN LATERAL jsonb_each(b.j) AS dc_pairs(key, value)
),
aligned AS MATERIALIZED (
  SELECT
    d.allocation_code,
    d.size_level_allocation,
    d.article,
    d.inv_avai,
    d.inventory_source,
    d.demand,
    d.size_curve,
    d.split_profile,
    d.ros,
    d.min,
    d.max,
    d.oh,
    d.oo,
    d.it,
    d.wos,
    d.final_inv_available,
    d.aps,
    d."order",
    d.shipping_date,
    d.store_grade,
    d.product_profile_selected,
    d.selected_store_count,
    d.store_group,
    d.original_forecast,
    d.constrained_forecast,
    d.max_supression_flag,
    d.lt_forecast,
    d.updated_oh_oo_it,
    d.min_influenced_allocation,
    d.order_priority,
    d.allocation_strategy,
    d.dos,
    d.store,
    d.size,
    d.dc_code,
    pack_ids.elem::text                  AS pack_type_id,
    COALESCE(q_alloc.elem::numeric, 0)   AS qty_allocated,
    COALESCE(q_avail.elem::numeric, 0)   AS qty_available,
    COALESCE(pr.elem::numeric, 0)        AS pack_rounding_factor
  FROM dc_level d
  CROSS JOIN LATERAL jsonb_array_elements_text(d.dc_payload->'packs_allocated')
    WITH ORDINALITY AS pack_ids(elem, ord)
  LEFT  JOIN LATERAL jsonb_array_elements_text(d.dc_payload->'packs_allocated_qty')
    WITH ORDINALITY AS q_alloc(elem, ord2) ON ord = ord2
  LEFT  JOIN LATERAL jsonb_array_elements_text(d.dc_payload->'packs_available_qty')
    WITH ORDINALITY AS q_avail(elem, ord3) ON ord = ord3
  LEFT  JOIN LATERAL jsonb_array_elements_text(d.dc_payload->'pack_rounding_factor')
    WITH ORDINALITY AS pr(elem, ord4) ON ord = ord4
),

/* Lookups */
uom_one AS MATERIALIZED (
  SELECT item_id, MAX(factor) AS factor
  FROM inventory_smart.uom
  GROUP BY item_id
),
sdau_one AS MATERIALIZED (
  SELECT
    article,
    dc_code::text       AS dc_code,
    pack_type_id::text  AS pack_type_id,
    MAX(units_in_pack)  AS units_in_pack
  FROM inventory_smart.sku_dc_available_units
  GROUP BY article, dc_code::text, pack_type_id::text
),
sdau_any AS MATERIALIZED (
  SELECT article, MAX(units_in_pack) AS units_in_pack_any
  FROM inventory_smart.sku_dc_available_units
  GROUP BY article
),

/* Size-level metrics and derived flags */
size_metrics AS MATERIALIZED (
  SELECT
    b.allocation_code,
    b.article,
    b.store,
    b.size,
    b.size_level_allocation,
    b.updated_oh_oo_it,
    b.original_forecast,
    b.demand,
    b.min,
    b.max,
    GREATEST(0, b.min - b.updated_oh_oo_it) AS min_short,
    GREATEST(0, b.size_level_allocation - GREATEST(0, b.min - b.updated_oh_oo_it)) AS wos_allocation,
    LEAST(b.size_level_allocation, GREATEST(0, b.min - b.updated_oh_oo_it)) AS min_allocation,
    (b.size_level_allocation + b.updated_oh_oo_it - b.original_forecast) BETWEEN 0 AND 1 AS is_allocation_constrainted,
    CASE WHEN NULLIF(b.original_forecast, 0) IS NULL THEN NULL
         ELSE ((b.size_level_allocation + b.updated_oh_oo_it - b.original_forecast) / NULLIF(b.original_forecast, 0)) * 100.0
    END AS constraint_deviation,
    LEAST(GREATEST(b.demand - b.updated_oh_oo_it, b.min, 0), b.max) AS target_allocation,
    (b.size_level_allocation > LEAST(GREATEST(b.demand - b.updated_oh_oo_it, b.min, 0), b.max)) AS excess_inventory_allocation,
    CASE
      WHEN ((b.size_level_allocation + b.updated_oh_oo_it - b.original_forecast) BETWEEN 0 AND 1)
       AND ((b.updated_oh_oo_it - b.original_forecast) < COALESCE(sa.units_in_pack_any, 1)/2.0)
      THEN TRUE ELSE FALSE
    END AS is_underallocated,
    CASE WHEN (b.size_level_allocation + b.updated_oh_oo_it - b.original_forecast) > 0 THEN TRUE ELSE FALSE END AS constraint_positive,
    CASE WHEN (b.size_level_allocation + b.updated_oh_oo_it - b.original_forecast) < 0 THEN TRUE ELSE FALSE END AS constraint_negative,
    CASE WHEN LEAST(b.size_level_allocation, GREATEST(0, b.min - b.updated_oh_oo_it))
               >= GREATEST(0, b.size_level_allocation - GREATEST(0, b.min - b.updated_oh_oo_it))
         THEN TRUE ELSE FALSE END AS min_max_influenced_allocation,
    CASE WHEN GREATEST(0, b.size_level_allocation - GREATEST(0, b.min - b.updated_oh_oo_it))
               >  LEAST(b.size_level_allocation, GREATEST(0, b.min - b.updated_oh_oo_it))
         THEN TRUE ELSE FALSE END AS wos_influenced_allocation,
    GREATEST(b.demand - b.updated_oh_oo_it - b.size_level_allocation, 0) AS lost_sales,
    ((b.demand >= b.max) AND ((b.size_level_allocation + b.updated_oh_oo_it - b.original_forecast) BETWEEN 0 AND 1)) AS max_limit,
    (((b.size_level_allocation + b.updated_oh_oo_it - b.original_forecast) BETWEEN 0 AND 1) AND (b.demand < b.max)) AS dc_constraint
  FROM base b
  LEFT JOIN sdau_any sa ON sa.article = b.article
),

/* Store-level and article-level percentages */
store_level_agg AS MATERIALIZED (
  SELECT
    article,
    store,
    COUNT(*) AS total_combos,
    COUNT(*) FILTER (WHERE constraint_positive AND size_level_allocation > 0) AS pos_and_alloc_cnt,
    COUNT(*) FILTER (WHERE constraint_negative) AS neg_cnt,
    BOOL_AND(NOT is_allocation_constrainted) AS demand_completed,
    (COUNT(*) FILTER (WHERE constraint_positive AND size_level_allocation > 0))::numeric
      / NULLIF(COUNT(*),0) * 100.0 AS overallocation_percentage_store_level,
    (COUNT(*) FILTER (WHERE constraint_positive AND size_level_allocation > 0))::numeric
      / NULLIF(COUNT(*),0) * 100.0 AS positive_constrant_impact_article_store_level,
    (COUNT(*) FILTER (WHERE constraint_negative))::numeric
      / NULLIF(COUNT(*),0) * 100.0 AS negative_constrant_impact_article_store_level,
    (
      ((COUNT(*) FILTER (WHERE constraint_positive AND size_level_allocation > 0))::numeric
        / NULLIF(COUNT(*),0) * 100.0)
      +
      ((COUNT(*) FILTER (WHERE constraint_negative))::numeric
        / NULLIF(COUNT(*),0) * 100.0)
    ) AS total_constraint_impac_article_store_level
  FROM size_metrics
  GROUP BY article, store
),
article_level_agg AS MATERIALIZED (
  SELECT
    article,
    COUNT(*) AS total_combos_article,
    COUNT(*) FILTER (WHERE constraint_positive AND size_level_allocation > 0) AS pos_and_alloc_cnt_article,
    COUNT(*) FILTER (WHERE constraint_negative) AS neg_cnt_article,
    (COUNT(*) FILTER (WHERE constraint_positive AND size_level_allocation > 0))::numeric
      / NULLIF(COUNT(*),0) * 100.0 AS overallocation_percentage_article_level,
    (COUNT(*) FILTER (WHERE constraint_positive AND size_level_allocation > 0))::numeric
      / NULLIF(COUNT(*),0) * 100.0 AS positive_constrant_impact_article_level,
    (COUNT(*) FILTER (WHERE constraint_negative))::numeric
      / NULLIF(COUNT(*),0) * 100.0 AS negative_constrant_impact_article_level,
    (
      ((COUNT(*) FILTER (WHERE constraint_positive AND size_level_allocation > 0))::numeric
        / NULLIF(COUNT(*),0) * 100.0)
      +
      ((COUNT(*) FILTER (WHERE constraint_negative))::numeric
        / NULLIF(COUNT(*),0) * 100.0)
    ) AS total_constrant_impact_article_level,
    BOOL_OR(NOT is_allocation_constrainted) AS has_any_unconstrained_article
  FROM size_metrics
  GROUP BY article
),

/* Net capacity by Store-Article-Size (SAS) */
base_table_net AS MATERIALIZED (
  SELECT allocation_code, article, store AS store_code, j AS pack_dc_allocation
  FROM base
),
article_l1_net AS MATERIALIZED (
  SELECT DISTINCT paf.article, paf.l0_name, paf.l1_name, paf.l2_name
  FROM global.product_attributes_filter paf
  WHERE paf.article IN (SELECT DISTINCT article FROM base)
),
flat_alloc_net AS MATERIALIZED (
  SELECT
    bt.allocation_code,
    bt.article,
    bt.store_code,
    SUM(x.elem::numeric) AS allocated_qty
  FROM (
    SELECT DISTINCT allocation_code, article, store_code, pack_dc_allocation
    FROM base_table_net
    WHERE pack_dc_allocation IS NOT NULL
  ) bt
  CROSS JOIN LATERAL jsonb_each(bt.pack_dc_allocation) AS dc(k, v)
  CROSS JOIN LATERAL jsonb_array_elements_text(v->'packs_allocated_qty') AS x(elem)
  GROUP BY 1, 2, 3
),
store_dept_inv_net AS MATERIALIZED (
  SELECT li.store_code, COALESCE(SUM(li.oh), 0) + COALESCE(SUM(li.it), 0) + COALESCE(SUM(li.oo), 0) AS store_inv
  FROM inventory_smart.latest_inventory li
  GROUP BY 1
),
store_capacity_net AS MATERIALIZED (
  SELECT suc.store_code, suc.product_hierarchy, MAX(suc.unit_capacity) AS unit_capacity
  FROM inventory_smart.store_unit_capacity suc
  WHERE suc.store_code IN (SELECT DISTINCT store FROM base)
  GROUP BY 1, 2
),
alloc_by_store_dept_net AS MATERIALIZED (
  SELECT
    fa.allocation_code,
    fa.article,
    fa.store_code,
    al.l0_name,
    al.l1_name,
    al.l2_name,
    SUM(fa.allocated_qty) AS allocated_qty
  FROM flat_alloc_net fa
  JOIN article_l1_net al ON fa.article = al.article
  GROUP BY 1, 2, 3, 4, 5, 6
),
net_capacity_by_sas AS MATERIALIZED (
  SELECT
    a.allocation_code,
    a.article,
    a.store_code,
    (
      MAX(COALESCE(sc.unit_capacity, 0))
      - SUM(COALESCE(sdi.store_inv, 0))
      - SUM(COALESCE(a.allocated_qty, 0))
    )::int AS net_capacity
  FROM alloc_by_store_dept_net a
  LEFT JOIN store_capacity_net sc
    ON sc.store_code = a.store_code
   AND sc.product_hierarchy = concat(a.l0_name, '-', a.l1_name, '-', a.l2_name)
  LEFT JOIN store_dept_inv_net sdi
    ON sdi.store_code = a.store_code
  GROUP BY a.allocation_code, a.article, a.store_code
),

/* CB-specific DC-level net available (units) */
cb_dc_available_units AS MATERIALIZED (
  SELECT
    a.article,
    a.dc_code::text     AS dc_code,
    a.pack_type_id::text AS pack_type_id,
    (
      AVG(
        CASE WHEN UPPER(COALESCE(paf.ia_sku_type, '')) = 'EACHES'
             THEN a.qty_available * COALESCE(a.pack_rounding_factor::numeric, COALESCE(dpc.units_in_pack::numeric, 1), 1)
             ELSE a.qty_available
        END
      )
      - SUM(
          a.qty_allocated *
          CASE
            WHEN UPPER(COALESCE(paf.ia_sku_type, '')) = 'EACHES'
              THEN COALESCE(a.pack_rounding_factor::numeric, COALESCE(dpc.units_in_pack::numeric, 1), 1)
            ELSE 1
          END
        )
    ) AS net_qty_available
  FROM aligned a
  LEFT JOIN inventory_smart.dc_pack_configuration dpc
    ON dpc.article = a.article
   AND dpc.pack_type_id::text = a.pack_type_id::text
   AND dpc.size = a.size
  LEFT JOIN "global".product_attributes_filter paf
    ON paf.product_code = a.pack_type_id::varchar
  GROUP BY 1, 2, 3
),
dc_flags AS MATERIALIZED (
  SELECT dau.article, dau.dc_code, SUM(dau.net_qty_available) AS sum_net_qty_available
  FROM cb_dc_available_units dau
  GROUP BY dau.article, dau.dc_code
),
pack_dc_flags AS MATERIALIZED (
  SELECT dau.article, dau.dc_code, dau.pack_type_id, SUM(dau.net_qty_available) AS sum_net_qty_available
  FROM cb_dc_available_units dau
  GROUP BY dau.article, dau.dc_code, dau.pack_type_id
),
pack_dc_constrained AS MATERIALIZED (
  SELECT a.article, a.dc_code, a.pack_type_id, BOOL_AND(sm.is_allocation_constrainted) AS all_constrained_pack_dc
  FROM aligned a
  JOIN size_metrics sm
    ON sm.allocation_code = a.allocation_code
   AND sm.article         = a.article
   AND sm.store           = a.store
   AND sm.size            = a.size
  GROUP BY 1, 2, 3
),
dc_constrained AS MATERIALIZED (
  SELECT a.article, a.dc_code, BOOL_AND(sm.is_allocation_constrainted) AS all_constrained_dc
  FROM aligned a
  JOIN size_metrics sm
    ON sm.allocation_code = a.allocation_code
   AND sm.article         = a.article
   AND sm.store           = a.store
   AND sm.size            = a.size
  GROUP BY 1, 2
),
article_constrained AS MATERIALIZED (
  SELECT sm.article, BOOL_AND(sm.is_allocation_constrainted) AS all_constrained_article
  FROM size_metrics sm
  GROUP BY sm.article
),

/* Article/DC/Pack-DC it+oo helpers */
article_it_oo AS MATERIALIZED (
  SELECT
    b.article,
    0::numeric AS sum_it_oo_article
  FROM (SELECT DISTINCT article FROM base) b
),
dc_it_oo AS MATERIALIZED (
  SELECT x.article, x.dc_code, 0::numeric AS sum_it_oo_dc
  FROM (SELECT DISTINCT article, dc_code FROM aligned) x
),
pack_dc_it_oo AS MATERIALIZED (
  SELECT x.article, x.dc_code, x.pack_type_id, 0::numeric AS sum_it_oo_pack_dc
  FROM (SELECT DISTINCT article, dc_code, pack_type_id FROM aligned) x
)

SELECT
  /* Identity */
  a.allocation_code,
  a.article,
  a.store,
  a.size,
  a.dc_code::text                           AS dc_code,
  a.pack_type_id::text                      AS pack_type_id,

  /* Pack-level raw counts */
  a.qty_allocated                           AS pack_level_allocation,
  a.qty_available                           AS pack_level_qty_available,

  /* CB-specific unit conversions */
  (
    CASE WHEN UPPER(COALESCE(paf_cb.ia_sku_type, '')) = 'EACHES'
         THEN a.qty_allocated * COALESCE(a.pack_rounding_factor::numeric, COALESCE(dpc.units_in_pack::numeric, 1), 1)
         ELSE a.qty_allocated
    END
  )                                         AS qty_allocated_cb,
  (
    CASE WHEN UPPER(COALESCE(paf_cb.ia_sku_type, '')) = 'EACHES'
         THEN a.qty_available * COALESCE(a.pack_rounding_factor::numeric, COALESCE(dpc.units_in_pack::numeric, 1), 1)
         ELSE a.qty_available
    END
  )                                         AS qty_available_cb,
  GREATEST(
    COALESCE(dpc.units_in_pack::numeric, 0),
    COALESCE(a.pack_rounding_factor::numeric, 0),
    COALESCE(uom.factor::numeric, 0),
    1::numeric
  )::int                                    AS unit_multiplier_cb,
  dcav.net_qty_available                    AS net_qty_available_cb,

  /* Legacy multipliers / capacity (for compatibility) */
  GREATEST(
    COALESCE(uom.factor::numeric, 0),
    COALESCE(sdau.units_in_pack::numeric, 0),
    1::numeric
  )::int                                    AS unit_multiplier,
  nc.net_capacity                           AS net_capacity,

  /* Detailed size/plan fields */
  a.size_level_allocation,
  a.inv_avai,
  a.inventory_source,
  a.demand,
  a.size_curve,
  a.split_profile,
  a.ros,
  a.min,
  a.max,
  a.oh,
  a.oo,
  a.it,
  a.wos,
  a.final_inv_available,
  a.aps,
  a."order",
  a.shipping_date,
  a.store_grade,
  a.product_profile_selected,
  a.selected_store_count,
  a.store_group,
  a.original_forecast,
  a.constrained_forecast,
  a.max_supression_flag,
  a.lt_forecast,
  a.updated_oh_oo_it,
  CASE
    WHEN a.min_influenced_allocation IS TRUE  THEN 1::numeric
    WHEN a.min_influenced_allocation IS FALSE THEN 0::numeric
    ELSE NULL::numeric
  END AS min_influenced_allocation,
  a.order_priority,
  a.allocation_strategy,
  a.dos,

  /* Product profile columns */
  ppm.name                                  AS product_profile_name,
  ppm.special_classification                AS product_profile_type,

  /* size-level metrics */
  sm.is_allocation_constrainted,
  sm.constraint_deviation,
  sm.target_allocation,
  sm.excess_inventory_allocation,
  sm.is_underallocated,
  sm.wos_allocation,
  sm.min_allocation,
  sm.min_max_influenced_allocation,
  sm.wos_influenced_allocation,
  sm.lost_sales,

  /* store/article level percentages */
  sla.demand_completed,
  sla.overallocation_percentage_store_level,
  sla.positive_constrant_impact_article_store_level,
  sla.negative_constrant_impact_article_store_level,
  sla.total_constraint_impac_article_store_level,

  ala.overallocation_percentage_article_level,
  ala.positive_constrant_impact_article_level,
  ala.negative_constrant_impact_article_level,
  ala.total_constrant_impact_article_level,

  /* limits and capacity */
  sm.max_limit,
  sm.dc_constraint,
  (COALESCE(nc.net_capacity,0) < 0) AS is_store_capacity_breached,

  /* dc/pack allocatability */
  (COALESCE(dcf.sum_net_qty_available,0) > 0 AND COALESCE(ala.has_any_unconstrained_article, FALSE)) AS can_dc_allocate,
  (COALESCE(pcf.sum_net_qty_available,0) > 0 AND COALESCE(ala.has_any_unconstrained_article, FALSE)) AS can_pack_allocate,

  /* upcoming-product constraints */
  (COALESCE(pdc.all_constrained_pack_dc, FALSE) AND COALESCE(pdio.sum_it_oo_pack_dc,0) > 0)::boolean AS upcoming_product_constrainted_article_pack_dc_level,
  (COALESCE(dcc.all_constrained_dc, FALSE)       AND COALESCE(dcio.sum_it_oo_dc,0) > 0)::boolean     AS upcoming_product_constrainted_article_dc_level,
  (COALESCE(ac.all_constrained_article, FALSE)   AND COALESCE(aio.sum_it_oo_article,0) > 0)::boolean AS upcoming_product_constrainted_article_level,

  (COALESCE(dcf.sum_net_qty_available,0) > 0) AS is_dc_reallocatable,

  /* DC transit meta */
  dctp.dc_transit_time,
  dctp.dc_priority,

  /* ph_master (pm): product hierarchy + meta (no wildcards) */
  pm.l0_name,
  pm.l1_name,
  pm.l2_name,
  pm.l3_name,
  pm.l4_name,
  pm.l5_name,
  pm.primary_trait_id,
  pm.primary_trait_desc,
  pm.style                                  AS style,
  pm.product_type                           AS product_type,
  pm.ph_code,
  pm.product_description                    AS product_description,
  pm.clearance                              AS article_clearance_flag,
  pm.channel                                AS product_channel,
  pm.launch_date                            AS article_launch_date,
  pm.item_status                            AS article_item_status,
  pm.article_status_tag                     AS article_status_tag,

 /* article_inventory_dashboard (aid): wide KPIs, avoiding collisions */
  aid.channel                               AS store_channel,
  aid.oh                                    AS store_oh,
  aid.it                                    AS store_it,
  aid.oo                                    AS store_oo,
  aid.tot_inv  store_total_inventory, 
  aid.promo_percentage,
  aid.wos_oh,
  aid.wos_oh_oo,
  aid.wos_oh_oo_it,
  aid.wos_oh_it,
  aid.sell_through_perc,
  aid.style_description,
  aid.clearance_start_date,
  aid.price,
  aid.msrp,
  aid.l4w_units,
  aid.l4w_revenue,
  aid.l8w_units,
  aid.l6m_units,
  aid.discount,
  aid.dc_wos_oh_oo_it,
  aid.dc_wos_oh_oo,
  aid.dc_wos_oh,
  aid.ata_eaches,
  aid.ata_packs,
  aid.ata,
  aid.oh_dc,
  aid.it_dc,
  aid.oo_dc,
  aid.in_stock_count,
  aid.instock_perc,
  aid.dc_instock,
  aid.dc_instock_count,
  aid.dc_instock_total_count,
  aid.dc_instock_perc,
  aid.in_stock_dc_ata_count,
  aid.in_stock_dc_ata_total_count,
  aid.in_stock_ata,
  aid.wtd_units,
  aid.w2_units,
  aid.w3_units,
  aid.w4_units,
  aid.w5_units,
  aid.w6_units,
  aid.w7_units,
  aid.w8_units,
  aid.twos,
  aid.article_alert_flag,
  aid.product_tag,
  /* store_attributes_filter (saf): store metadata */
  NULL::varchar AS store_description,
  saf.region,
  saf.country,
  NULL::varchar AS state,
  saf.district,
  NULL::varchar AS city,
  NULL::varchar AS climate,
  saf.close_date,
  NULL::varchar AS s0_name,
  NULL::varchar AS like_store_id,
  NULL::varchar AS s1_name,
  NULL::varchar AS s2_name,
  NULL::varchar AS s3_name,
  NULL::varchar AS s4_name,
  NULL::varchar AS store_status,
  NULL::varchar AS store_tier,
  saf.zipcode,
  NULL::varchar AS saf_store_name,
  saf.open_date,
  saf.channel                               AS saf_channel,
  saf.active                                AS saf_active,
  saf.special_classification                AS saf_special_classification

FROM aligned a

/* product hierarchy and store/article dashboards */
LEFT JOIN inventory_smart.ph_master pm
  ON pm.article::text = a.article::text
LEFT JOIN inventory_smart.article_inventory_dashboard aid
  ON aid.article::text    = a.article::text
 AND aid.store_code::text = a.store::text
LEFT JOIN "global".store_attributes_filter saf
  ON saf.store_code::text = a.store::text

/* CB conversion helpers */
LEFT JOIN inventory_smart.dc_pack_configuration dpc
  ON dpc.article = a.article
 AND dpc.pack_type_id::text = a.pack_type_id::text
 AND dpc.size = a.size
LEFT JOIN "global".product_attributes_filter paf_cb
  ON paf_cb.product_code = a.pack_type_id::varchar
LEFT JOIN uom_one uom
  ON a.article = uom.item_id

/* legacy multiplier capacity joins */
LEFT JOIN sdau_one sdau
  ON sdau.article = a.article
 AND sdau.dc_code = a.dc_code::text
 AND sdau.pack_type_id = a.pack_type_id::text
LEFT JOIN net_capacity_by_sas nc
  ON nc.allocation_code::text = a.allocation_code::text
 AND nc.article::text         = a.article::text
 AND nc.store_code::text      = a.store::text

/* CB dc-level availability */
LEFT JOIN cb_dc_available_units dcav
  ON dcav.article::text      = a.article::text
 AND dcav.dc_code::text      = a.dc_code::text
 AND dcav.pack_type_id::text = a.pack_type_id::text

/* size metrics and rollups */
LEFT JOIN size_metrics sm
  ON sm.allocation_code::text = a.allocation_code::text
 AND sm.article::text         = a.article::text
 AND sm.store::text           = a.store::text
 AND sm.size::text            = a.size::text
LEFT JOIN store_level_agg sla
  ON sla.article::text = a.article::text
 AND sla.store::text   = a.store::text
LEFT JOIN article_level_agg ala
  ON ala.article::text = a.article::text

/* dc/pack alloc flags and constraints */
LEFT JOIN dc_flags dcf
  ON dcf.article::text = a.article::text
 AND dcf.dc_code::text = a.dc_code::text
LEFT JOIN pack_dc_flags pcf
  ON pcf.article::text      = a.article::text
 AND pcf.dc_code::text      = a.dc_code::text
 AND pcf.pack_type_id::text = a.pack_type_id::text
LEFT JOIN pack_dc_constrained pdc
  ON pdc.article::text      = a.article::text
 AND pdc.dc_code::text      = a.dc_code::text
 AND pdc.pack_type_id::text = a.pack_type_id::text
LEFT JOIN dc_constrained dcc
  ON dcc.article::text = a.article::text
 AND dcc.dc_code::text = a.dc_code::text
LEFT JOIN article_constrained ac
  ON ac.article::text = a.article::text

/* it+oo helpers and DC transit */
LEFT JOIN pack_dc_it_oo pdio
  ON pdio.article::text      = a.article::text
 AND pdio.dc_code::text      = a.dc_code::text
 AND pdio.pack_type_id::text = a.pack_type_id::text
LEFT JOIN dc_it_oo dcio
  ON dcio.article::text = a.article::text
 AND dcio.dc_code::text = a.dc_code::text
LEFT JOIN article_it_oo aio
  ON aio.article::text  = a.article::text
LEFT JOIN dc_ttp dctp
  ON dctp.store_code::text = a.store::text
 AND dctp.dc_code::text    = a.dc_code::text
LEFT JOIN inventory_smart.product_profile_master ppm
  ON ppm.pp_code::text = a.product_profile_selected::text

$$;