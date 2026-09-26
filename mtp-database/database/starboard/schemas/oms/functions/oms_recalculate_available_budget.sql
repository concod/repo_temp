--liquibase formatted sql
--changeset nikhil.madhusudan@impactanalytics.co:oms_recalculate_available_budget_2 runOnChange:true stripComments:false splitStatements:false context:Release_1_3 labels:MTP-91512
--comment: Recalculate available budget from full order rows (oor before delete); scope by hierarchy + time periods + loc_code.
--rollback: SELECT 1

DROP FUNCTION IF EXISTS oms.oms_recalculate_available_budget(jsonb);

CREATE OR REPLACE FUNCTION oms.oms_recalculate_available_budget(order_rows_json jsonb DEFAULT NULL::jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
/*
  Recalculates available_budget_cost and available_budget_units as:
  Available = Planned - (PO + Approved + Pending + Under Review)

  Only for (hierarchy_id, time_period_id) implied by the passed order rows (from oms_orders_recommended
  before delete). Each order row drives: loc_code, product_code, article, editable_expected_receipt_date.
  Hierarchy is resolved via oms.budget_product_hierarchy vs global.product_attributes_filter: same loc_code and
  (product_code OR article OR any l0..l5 where bph.lN is non-null and equals paf.lN). Finer-grained rows are chosen via hierarchy_rankings.
  time periods from global.fiscal_date_mapping on receipt date.

  order_rows_json: array of {loc_code, product_code, article, editable_expected_receipt_date}.

  Consumed: per (hierarchy_id, time_period) — each order is counted only toward the single best-fit hierarchy
  (oms.hierarchy_rankings; higher ranking = closer). Units use order_quantity (not order_quantity_eaches). Oor (order_status_id IN (-1,1,2)) + ooa (is_deleted = false).
  UPDATE only allocation rows whose (hierarchy_id, time_period_id) are in the set derived from those rows.
  target_keys: receipt week + receipt month, plus every fiscal week that maps to those months on fdm (same idea as
  monthly matrix / get_budget_data: month scope pulls all orders in the month, so every week row in that month must refresh).
  Fallback: recalc runs for all hierarchies in the (loc_code, time_period) scope implied by the order rows
  edited receipt date (oms.budget_time_periods); consumed is still attributed per order to the best-fit hierarchy.
*/
DECLARE
  v_sql text;
BEGIN
  IF order_rows_json IS NULL OR jsonb_array_length(order_rows_json) = 0 THEN
    RETURN;
  END IF;

  v_sql := format(
    $q$
  WITH order_rows AS (
    SELECT
      NULLIF(TRIM(elem->>'loc_code'), '')::text AS loc_code,
      NULLIF(TRIM(elem->>'product_code'), '')::text AS product_code,
      NULLIF(TRIM(elem->>'article'), '')::text AS article,
      (elem->>'editable_expected_receipt_date')::date AS receipt_date
    FROM jsonb_array_elements(%L::jsonb) AS elem
    WHERE NULLIF(TRIM(elem->>'loc_code'), '') IS NOT NULL
      AND (elem->>'editable_expected_receipt_date') IS NOT NULL
  ),
  receipt_to_fiscal AS (
    SELECT date::date AS receipt_date,
           fiscal_year_week::text AS fiscal_year_week,
           fiscal_year_month::text AS fiscal_year_month
    FROM global.fiscal_date_mapping
  ),
  order_with_fiscal AS (
    SELECT
      o.loc_code,
      o.product_code,
      o.article,
      fdm.fiscal_year_week,
      fdm.fiscal_year_month
    FROM order_rows o
    JOIN receipt_to_fiscal fdm ON o.receipt_date = fdm.receipt_date
    WHERE (NULLIF(TRIM(fdm.fiscal_year_week), '') IS NOT NULL OR NULLIF(TRIM(fdm.fiscal_year_month), '') IS NOT NULL)
  ),
  target_keys AS (
    SELECT DISTINCT loc_code, 'WEEK'::text AS time_period_type, fiscal_year_week AS time_period_key
    FROM order_with_fiscal
    WHERE fiscal_year_week IS NOT NULL AND fiscal_year_week <> ''
    UNION
    SELECT DISTINCT loc_code, 'MONTH'::text, fiscal_year_month
    FROM order_with_fiscal
    WHERE fiscal_year_month IS NOT NULL AND fiscal_year_month <> ''
    UNION
    SELECT DISTINCT owf.loc_code, 'WEEK'::text, fdm.fiscal_year_week::text AS time_period_key
    FROM order_with_fiscal owf
    INNER JOIN global.fiscal_date_mapping fdm
      ON fdm.fiscal_year_month::text = owf.fiscal_year_month::text
    WHERE NULLIF(TRIM(owf.fiscal_year_month), '') IS NOT NULL
      AND NULLIF(TRIM(fdm.fiscal_year_week::text), '') IS NOT NULL
  ),
  target_allocations AS (
    SELECT DISTINCT bph.hierarchy_id, btp.time_period_id
    FROM target_keys tk
    JOIN oms.budget_product_hierarchy bph
      ON bph.loc_code = tk.loc_code AND bph.is_active = true
    JOIN oms.budget_time_periods btp
      ON btp.is_active = true
     AND btp.time_period_type = tk.time_period_type
     AND btp.time_period_key::text = tk.time_period_key
  ),
  matching_recommended AS (
    SELECT
      oor.id AS order_id,
      bph.hierarchy_id,
      oor.loc_code,
      fdm.fiscal_year_week,
      fdm.fiscal_year_month,
      COALESCE(oor.order_cost) AS order_cost,
      COALESCE(oor.order_quantity_eaches, oor.order_quantity) AS order_units,
      COALESCE(hr.ranking, -1) AS match_depth
    FROM oms.oms_orders_recommended oor
    JOIN receipt_to_fiscal fdm
      ON (COALESCE(oor.editable_expected_receipt_date, oor.expected_receipt_date)::date = fdm.receipt_date)
    INNER JOIN target_keys tk
      ON oor.loc_code = tk.loc_code
      AND ((tk.time_period_type = 'WEEK' AND fdm.fiscal_year_week = tk.time_period_key)
           OR (tk.time_period_type = 'MONTH' AND fdm.fiscal_year_month = tk.time_period_key))
    LEFT JOIN global.product_attributes_filter paf ON paf.product_code = oor.product_code
    INNER JOIN oms.budget_product_hierarchy bph
      ON bph.loc_code = oor.loc_code
     AND bph.is_active = true
     AND (bph.product_code = oor.product_code
          OR bph.article = oor.article
          /* Single-level tie-breakers (matrix-style): any explicit level on bph may match PAF at that level even when finer bph levels disagree with PAF. */
          OR (bph.l0_name IS NOT NULL AND bph.l0_name = paf.l0_name)
          OR (bph.l1_name IS NOT NULL AND bph.l1_name = paf.l1_name)
          OR (bph.l2_name IS NOT NULL AND bph.l2_name = paf.l2_name)
          OR (bph.l3_name IS NOT NULL AND bph.l3_name = paf.l3_name)
          OR (bph.l4_name IS NOT NULL AND bph.l4_name = paf.l4_name)
          OR (bph.l5_name IS NOT NULL AND bph.l5_name = paf.l5_name))
    LEFT JOIN oms.hierarchy_rankings hr ON hr.hier_level = (
      CASE WHEN bph.hierarchy_level ~ '^L[0-9]+$' THEN LOWER(bph.hierarchy_level) || '_name'
           ELSE LOWER(bph.hierarchy_level) END
    )
    INNER JOIN target_allocations ta ON ta.hierarchy_id = bph.hierarchy_id
    WHERE oor.order_status_id IN (-1, 1, 2)
      AND (oor.is_deleted = false OR oor.is_deleted IS NULL)
  ),
  best_recommended AS (
    SELECT order_id, hierarchy_id, loc_code, fiscal_year_week, fiscal_year_month, order_cost, order_units,
      ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY match_depth DESC) AS rn
    FROM matching_recommended
    WHERE match_depth >= -1
  ),
  consumed_recommended AS (
    SELECT hierarchy_id, loc_code, fiscal_year_week, fiscal_year_month,
      COALESCE(SUM(order_cost), 0) AS cost,
      COALESCE(SUM(order_units), 0) AS units
    FROM best_recommended
    WHERE rn = 1
    GROUP BY hierarchy_id, loc_code, fiscal_year_week, fiscal_year_month
  ),
  matching_approved AS (
    SELECT
      ooa.id AS order_id,
      bph.hierarchy_id,
      ooa.loc_code,
      fdm.fiscal_year_week,
      fdm.fiscal_year_month,
      COALESCE(ooa.order_cost) AS order_cost,
      COALESCE(ooa.order_quantity_eaches, ooa.order_quantity) AS order_units,
      COALESCE(hr.ranking, -1) AS match_depth
    FROM oms.oms_orders_approved ooa
    JOIN receipt_to_fiscal fdm
      ON (COALESCE(ooa.editable_expected_receipt_date, ooa.expected_receipt_date)::date = fdm.receipt_date)
    INNER JOIN target_keys tk
      ON ooa.loc_code = tk.loc_code
      AND ((tk.time_period_type = 'WEEK' AND fdm.fiscal_year_week = tk.time_period_key)
           OR (tk.time_period_type = 'MONTH' AND fdm.fiscal_year_month = tk.time_period_key))
    LEFT JOIN global.product_attributes_filter paf ON paf.product_code = ooa.product_code
    INNER JOIN oms.budget_product_hierarchy bph
      ON bph.loc_code = ooa.loc_code
     AND bph.is_active = true
     AND (bph.product_code = ooa.product_code
          OR bph.article = ooa.article
          OR (bph.l0_name IS NOT NULL AND bph.l0_name = paf.l0_name)
          OR (bph.l1_name IS NOT NULL AND bph.l1_name = paf.l1_name)
          OR (bph.l2_name IS NOT NULL AND bph.l2_name = paf.l2_name)
          OR (bph.l3_name IS NOT NULL AND bph.l3_name = paf.l3_name)
          OR (bph.l4_name IS NOT NULL AND bph.l4_name = paf.l4_name)
          OR (bph.l5_name IS NOT NULL AND bph.l5_name = paf.l5_name))
    LEFT JOIN oms.hierarchy_rankings hr ON hr.hier_level = (
      CASE WHEN bph.hierarchy_level ~ '^L[0-9]+$' THEN LOWER(bph.hierarchy_level) || '_name'
           ELSE LOWER(bph.hierarchy_level) END
    )
    INNER JOIN target_allocations ta ON ta.hierarchy_id = bph.hierarchy_id
    WHERE (ooa.is_deleted = false OR ooa.is_deleted IS NULL)
  ),
  best_approved AS (
    SELECT order_id, hierarchy_id, loc_code, fiscal_year_week, fiscal_year_month, order_cost, order_units,
      ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY match_depth DESC) AS rn
    FROM matching_approved
    WHERE match_depth >= -1
  ),
  consumed_approved AS (
    SELECT hierarchy_id, loc_code, fiscal_year_week, fiscal_year_month,
      COALESCE(SUM(order_cost), 0) AS cost,
      COALESCE(SUM(order_units), 0) AS units
    FROM best_approved
    WHERE rn = 1
    GROUP BY hierarchy_id, loc_code, fiscal_year_week, fiscal_year_month
  ),
  consumed_week AS (
    SELECT hierarchy_id, loc_code, fiscal_year_week AS time_period_key, 'WEEK'::text AS time_period_type,
           SUM(cost) AS consumed_cost, SUM(units) AS consumed_units
    FROM (
      SELECT hierarchy_id, loc_code, fiscal_year_week, cost, units FROM consumed_recommended
      UNION ALL
      SELECT hierarchy_id, loc_code, fiscal_year_week, cost, units FROM consumed_approved
    ) u
    GROUP BY hierarchy_id, loc_code, fiscal_year_week
  ),
  consumed_month AS (
    SELECT hierarchy_id, loc_code, fiscal_year_month AS time_period_key, 'MONTH'::text AS time_period_type,
           SUM(cost) AS consumed_cost, SUM(units) AS consumed_units
    FROM (
      SELECT hierarchy_id, loc_code, fiscal_year_month, cost, units FROM consumed_recommended
      UNION ALL
      SELECT hierarchy_id, loc_code, fiscal_year_month, cost, units FROM consumed_approved
    ) u
    GROUP BY hierarchy_id, loc_code, fiscal_year_month
  ),
  consumed AS (
    SELECT * FROM consumed_week
    UNION ALL
    SELECT * FROM consumed_month
  )
  UPDATE oms.budget_allocation ba
  SET
    available_budget_cost = GREATEST(0, COALESCE(ba.planned_budget_cost, 0) - COALESCE(c.consumed_cost, 0)),
    available_budget_units = GREATEST(0, COALESCE(ba.planned_budget_units, 0) - COALESCE(c.consumed_units, 0)),
    updated_at = CURRENT_TIMESTAMP
  FROM oms.budget_product_hierarchy bph
  INNER JOIN target_allocations ta ON ta.hierarchy_id = bph.hierarchy_id
  JOIN oms.budget_time_periods btp ON btp.time_period_id = ta.time_period_id AND btp.is_active = true
  INNER JOIN target_keys tk
    ON bph.loc_code = tk.loc_code
    AND btp.time_period_type = tk.time_period_type
    AND btp.time_period_key::text = tk.time_period_key
  LEFT JOIN consumed c
    ON c.hierarchy_id = bph.hierarchy_id
    AND bph.loc_code = c.loc_code
    AND btp.time_period_type = c.time_period_type
    AND btp.time_period_key::text = c.time_period_key
  WHERE ba.hierarchy_id = bph.hierarchy_id
    AND ba.time_period_id = btp.time_period_id
    AND bph.is_active = true
    $q$,
    order_rows_json
  );

  RAISE NOTICE 'oms_recalculate_available_budget final query: %', v_sql;
  EXECUTE v_sql;
END;
$function$
;