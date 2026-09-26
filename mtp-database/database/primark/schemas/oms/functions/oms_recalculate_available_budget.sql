--liquibase formatted sql
--changeset nikhil.madhusudan@impactanalytics.co:oms_recalculate_available_budget_9 runOnChange:true stripComments:false splitStatements:false context:Release_1_3 labels:MTP-91512
--comment: Recalculate available from order rows. PAF cascade: tier k requires bph not to fix levels below bucket depth (e.g. L4 tier needs bph.l5_name IS NULL). Direct product/article tier 6. Tie-break: match_tier desc, paf exact count, specificity, hierarchy_id. If hierarchy has WEEK allocations, MONTH rows get available=planned only (consumption on WEEK only).
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

  When a hierarchy has any WEEK budget_allocation row, MONTH rows for that hierarchy are set to available = planned
  (no month-grain consumption subtracted); consumption is applied only on WEEK rows. Aligns with get_budget_data /
  matrix month view summing MONTH + weeks under the month. If no WEEK allocations exist for the hierarchy,
  consumption is applied on MONTH rows only (unchanged behavior).
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
      ranked.order_id,
      ranked.hierarchy_id,
      ranked.loc_code,
      ranked.fiscal_year_week,
      ranked.fiscal_year_month,
      ranked.order_cost,
      ranked.order_units,
      ranked.specificity_score,
      ranked.paf_level_exact_match_count,
      ranked.match_tier
    FROM (
      SELECT
        base0.order_id,
        base0.hierarchy_id,
        base0.loc_code,
        base0.fiscal_year_week,
        base0.fiscal_year_month,
        base0.order_cost,
        base0.order_units,
        base0.specificity_score,
        base0.paf_level_exact_match_count,
        CASE
          WHEN base0.is_direct_product_match THEN 6
          WHEN base0.is_direct_article_match THEN 6
          WHEN base0.max_hierarchy_depth >= 5 AND base0.l0_ok AND base0.l1_ok AND base0.l2_ok AND base0.l3_ok AND base0.l4_ok AND base0.l5_ok THEN 5
          WHEN base0.max_hierarchy_depth >= 4 AND base0.l0_ok AND base0.l1_ok AND base0.l2_ok AND base0.l3_ok AND base0.l4_ok AND base0.bph_l5_unspecified THEN 4
          WHEN base0.max_hierarchy_depth >= 3 AND base0.l0_ok AND base0.l1_ok AND base0.l2_ok AND base0.l3_ok AND base0.bph_l4_unspecified AND base0.bph_l5_unspecified THEN 3
          WHEN base0.max_hierarchy_depth >= 2 AND base0.l0_ok AND base0.l1_ok AND base0.l2_ok AND base0.bph_l3_unspecified AND base0.bph_l4_unspecified AND base0.bph_l5_unspecified THEN 2
          WHEN base0.max_hierarchy_depth >= 1 AND base0.l0_ok AND base0.l1_ok AND base0.bph_l2_unspecified AND base0.bph_l3_unspecified AND base0.bph_l4_unspecified AND base0.bph_l5_unspecified THEN 1
          WHEN base0.max_hierarchy_depth >= 0 AND base0.l0_ok AND base0.bph_l1_unspecified AND base0.bph_l2_unspecified AND base0.bph_l3_unspecified AND base0.bph_l4_unspecified AND base0.bph_l5_unspecified THEN 0
          ELSE NULL
        END AS match_tier
      FROM (
      SELECT
        oor.id AS order_id,
        bph.hierarchy_id,
        oor.loc_code,
        fdm.fiscal_year_week,
        fdm.fiscal_year_month,
        COALESCE(oor.order_cost) AS order_cost,
        COALESCE(oor.order_quantity_eaches, oor.order_quantity) AS order_units,
        (
          (CASE WHEN bph.product_code IS NOT NULL THEN 1 ELSE 0 END) +
          (CASE WHEN bph.article IS NOT NULL THEN 1 ELSE 0 END) +
          (CASE WHEN bph.l0_name IS NOT NULL THEN 1 ELSE 0 END) +
          (CASE WHEN bph.l1_name IS NOT NULL THEN 1 ELSE 0 END) +
          (CASE WHEN bph.l2_name IS NOT NULL THEN 1 ELSE 0 END) +
          (CASE WHEN bph.l3_name IS NOT NULL THEN 1 ELSE 0 END) +
          (CASE WHEN bph.l4_name IS NOT NULL THEN 1 ELSE 0 END) +
          (CASE WHEN bph.l5_name IS NOT NULL THEN 1 ELSE 0 END)
        ) AS specificity_score,
        (
          (CASE WHEN bph.l0_name IS NOT NULL AND bph.l0_name = paf.l0_name THEN 1 ELSE 0 END) +
          (CASE WHEN bph.l1_name IS NOT NULL AND bph.l1_name = paf.l1_name THEN 1 ELSE 0 END) +
          (CASE WHEN bph.l2_name IS NOT NULL AND bph.l2_name = paf.l2_name THEN 1 ELSE 0 END) +
          (CASE WHEN bph.l3_name IS NOT NULL AND bph.l3_name = paf.l1_name THEN 1 ELSE 0 END) +
          (CASE WHEN bph.l4_name IS NOT NULL AND bph.l4_name = paf.l2_name THEN 1 ELSE 0 END) +
          (CASE WHEN bph.l5_name IS NOT NULL AND bph.l5_name = paf.l3_name THEN 1 ELSE 0 END)
        ) AS paf_level_exact_match_count,
        (bph.product_code IS NOT NULL AND bph.product_code = oor.product_code) AS is_direct_product_match,
        (bph.article IS NOT NULL AND bph.article = oor.article) AS is_direct_article_match,
        CASE UPPER(COALESCE(bph.hierarchy_level, 'L5'))
          WHEN 'L0' THEN 0 WHEN 'L1' THEN 1 WHEN 'L2' THEN 2 WHEN 'L3' THEN 3 WHEN 'L4' THEN 4 ELSE 5
        END AS max_hierarchy_depth,
        (bph.l0_name IS NULL OR bph.l0_name = paf.l0_name) AS l0_ok,
        (bph.l1_name IS NULL OR bph.l1_name = paf.l1_name) AS l1_ok,
        (bph.l2_name IS NULL OR bph.l2_name = paf.l2_name) AS l2_ok,
        (bph.l3_name IS NULL OR bph.l3_name = paf.l1_name) AS l3_ok,
        (bph.l4_name IS NULL OR bph.l4_name = paf.l2_name) AS l4_ok,
        (bph.l5_name IS NULL OR bph.l5_name = paf.l3_name) AS l5_ok,
        (bph.l1_name IS NULL) AS bph_l1_unspecified,
        (bph.l2_name IS NULL) AS bph_l2_unspecified,
        (bph.l3_name IS NULL) AS bph_l3_unspecified,
        (bph.l4_name IS NULL) AS bph_l4_unspecified,
        (bph.l5_name IS NULL) AS bph_l5_unspecified
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
       AND (
            (bph.product_code IS NOT NULL AND bph.product_code = oor.product_code)
            OR (bph.article IS NOT NULL AND bph.article = oor.article)
            OR (
              paf.product_code IS NOT NULL
              AND bph.product_code IS NULL
              AND bph.article IS NULL
              AND (
                (
                  (CASE UPPER(COALESCE(bph.hierarchy_level, 'L5'))
                    WHEN 'L0' THEN 0 WHEN 'L1' THEN 1 WHEN 'L2' THEN 2 WHEN 'L3' THEN 3 WHEN 'L4' THEN 4 ELSE 5
                  END) >= 5
                  AND (bph.l0_name IS NULL OR bph.l0_name = paf.l0_name)
                  AND (bph.l1_name IS NULL OR bph.l1_name = paf.l1_name)
                  AND (bph.l2_name IS NULL OR bph.l2_name = paf.l2_name)
                  AND (bph.l3_name IS NULL OR bph.l3_name = paf.l1_name)
                  AND (bph.l4_name IS NULL OR bph.l4_name = paf.l2_name)
                  AND (bph.l5_name IS NULL OR bph.l5_name = paf.l3_name)
                )
                OR (
                  (CASE UPPER(COALESCE(bph.hierarchy_level, 'L5'))
                    WHEN 'L0' THEN 0 WHEN 'L1' THEN 1 WHEN 'L2' THEN 2 WHEN 'L3' THEN 3 WHEN 'L4' THEN 4 ELSE 5
                  END) >= 4
                  AND (bph.l0_name IS NULL OR bph.l0_name = paf.l0_name)
                  AND (bph.l1_name IS NULL OR bph.l1_name = paf.l1_name)
                  AND (bph.l2_name IS NULL OR bph.l2_name = paf.l2_name)
                  AND (bph.l3_name IS NULL OR bph.l3_name = paf.l1_name)
                  AND (bph.l4_name IS NULL OR bph.l4_name = paf.l2_name)
                  AND bph.l5_name IS NULL
                )
                OR (
                  (CASE UPPER(COALESCE(bph.hierarchy_level, 'L5'))
                    WHEN 'L0' THEN 0 WHEN 'L1' THEN 1 WHEN 'L2' THEN 2 WHEN 'L3' THEN 3 WHEN 'L4' THEN 4 ELSE 5
                  END) >= 3
                  AND (bph.l0_name IS NULL OR bph.l0_name = paf.l0_name)
                  AND (bph.l1_name IS NULL OR bph.l1_name = paf.l1_name)
                  AND (bph.l2_name IS NULL OR bph.l2_name = paf.l2_name)
                  AND (bph.l3_name IS NULL OR bph.l3_name = paf.l1_name)
                  AND bph.l4_name IS NULL
                  AND bph.l5_name IS NULL
                )
                OR (
                  (CASE UPPER(COALESCE(bph.hierarchy_level, 'L5'))
                    WHEN 'L0' THEN 0 WHEN 'L1' THEN 1 WHEN 'L2' THEN 2 WHEN 'L3' THEN 3 WHEN 'L4' THEN 4 ELSE 5
                  END) >= 2
                  AND (bph.l0_name IS NULL OR bph.l0_name = paf.l0_name)
                  AND (bph.l1_name IS NULL OR bph.l1_name = paf.l1_name)
                  AND (bph.l2_name IS NULL OR bph.l2_name = paf.l2_name)
                  AND bph.l3_name IS NULL
                  AND bph.l4_name IS NULL
                  AND bph.l5_name IS NULL
                )
                OR (
                  (CASE UPPER(COALESCE(bph.hierarchy_level, 'L5'))
                    WHEN 'L0' THEN 0 WHEN 'L1' THEN 1 WHEN 'L2' THEN 2 WHEN 'L3' THEN 3 WHEN 'L4' THEN 4 ELSE 5
                  END) >= 1
                  AND (bph.l0_name IS NULL OR bph.l0_name = paf.l0_name)
                  AND (bph.l1_name IS NULL OR bph.l1_name = paf.l1_name)
                  AND bph.l2_name IS NULL
                  AND bph.l3_name IS NULL
                  AND bph.l4_name IS NULL
                  AND bph.l5_name IS NULL
                )
                OR (
                  (CASE UPPER(COALESCE(bph.hierarchy_level, 'L5'))
                    WHEN 'L0' THEN 0 WHEN 'L1' THEN 1 WHEN 'L2' THEN 2 WHEN 'L3' THEN 3 WHEN 'L4' THEN 4 ELSE 5
                  END) >= 0
                  AND (bph.l0_name IS NULL OR bph.l0_name = paf.l0_name)
                  AND bph.l1_name IS NULL
                  AND bph.l2_name IS NULL
                  AND bph.l3_name IS NULL
                  AND bph.l4_name IS NULL
                  AND bph.l5_name IS NULL
                )
              )
            )
          )
      WHERE oor.order_status_id IN (-1, 1, 2)
        AND (oor.is_deleted = false OR oor.is_deleted IS NULL)
      ) base0
    ) ranked
    INNER JOIN target_allocations ta ON ta.hierarchy_id = ranked.hierarchy_id
    WHERE ranked.match_tier IS NOT NULL
  ),
  best_recommended AS (
    SELECT order_id, hierarchy_id, loc_code, fiscal_year_week, fiscal_year_month, order_cost, order_units,
      ROW_NUMBER() OVER (
        PARTITION BY order_id
        ORDER BY match_tier DESC, paf_level_exact_match_count DESC, specificity_score DESC, hierarchy_id ASC
      ) AS rn
    FROM matching_recommended
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
      ranked.order_id,
      ranked.hierarchy_id,
      ranked.loc_code,
      ranked.fiscal_year_week,
      ranked.fiscal_year_month,
      ranked.order_cost,
      ranked.order_units,
      ranked.specificity_score,
      ranked.paf_level_exact_match_count,
      ranked.match_tier
    FROM (
      SELECT
        base0.order_id,
        base0.hierarchy_id,
        base0.loc_code,
        base0.fiscal_year_week,
        base0.fiscal_year_month,
        base0.order_cost,
        base0.order_units,
        base0.specificity_score,
        base0.paf_level_exact_match_count,
        CASE
          WHEN base0.is_direct_product_match THEN 6
          WHEN base0.is_direct_article_match THEN 6
          WHEN base0.max_hierarchy_depth >= 5 AND base0.l0_ok AND base0.l1_ok AND base0.l2_ok AND base0.l3_ok AND base0.l4_ok AND base0.l5_ok THEN 5
          WHEN base0.max_hierarchy_depth >= 4 AND base0.l0_ok AND base0.l1_ok AND base0.l2_ok AND base0.l3_ok AND base0.l4_ok AND base0.bph_l5_unspecified THEN 4
          WHEN base0.max_hierarchy_depth >= 3 AND base0.l0_ok AND base0.l1_ok AND base0.l2_ok AND base0.l3_ok AND base0.bph_l4_unspecified AND base0.bph_l5_unspecified THEN 3
          WHEN base0.max_hierarchy_depth >= 2 AND base0.l0_ok AND base0.l1_ok AND base0.l2_ok AND base0.bph_l3_unspecified AND base0.bph_l4_unspecified AND base0.bph_l5_unspecified THEN 2
          WHEN base0.max_hierarchy_depth >= 1 AND base0.l0_ok AND base0.l1_ok AND base0.bph_l2_unspecified AND base0.bph_l3_unspecified AND base0.bph_l4_unspecified AND base0.bph_l5_unspecified THEN 1
          WHEN base0.max_hierarchy_depth >= 0 AND base0.l0_ok AND base0.bph_l1_unspecified AND base0.bph_l2_unspecified AND base0.bph_l3_unspecified AND base0.bph_l4_unspecified AND base0.bph_l5_unspecified THEN 0
          ELSE NULL
        END AS match_tier
      FROM (
      SELECT
        ooa.id AS order_id,
        bph.hierarchy_id,
        ooa.loc_code,
        fdm.fiscal_year_week,
        fdm.fiscal_year_month,
        COALESCE(ooa.order_cost) AS order_cost,
        COALESCE(ooa.order_quantity_eaches, ooa.order_quantity) AS order_units,
        (
          (CASE WHEN bph.product_code IS NOT NULL THEN 1 ELSE 0 END) +
          (CASE WHEN bph.article IS NOT NULL THEN 1 ELSE 0 END) +
          (CASE WHEN bph.l0_name IS NOT NULL THEN 1 ELSE 0 END) +
          (CASE WHEN bph.l1_name IS NOT NULL THEN 1 ELSE 0 END) +
          (CASE WHEN bph.l2_name IS NOT NULL THEN 1 ELSE 0 END) +
          (CASE WHEN bph.l3_name IS NOT NULL THEN 1 ELSE 0 END) +
          (CASE WHEN bph.l4_name IS NOT NULL THEN 1 ELSE 0 END) +
          (CASE WHEN bph.l5_name IS NOT NULL THEN 1 ELSE 0 END)
        ) AS specificity_score,
        (
          (CASE WHEN bph.l0_name IS NOT NULL AND bph.l0_name = paf.l0_name THEN 1 ELSE 0 END) +
          (CASE WHEN bph.l1_name IS NOT NULL AND bph.l1_name = paf.l1_name THEN 1 ELSE 0 END) +
          (CASE WHEN bph.l2_name IS NOT NULL AND bph.l2_name = paf.l2_name THEN 1 ELSE 0 END) +
          (CASE WHEN bph.l3_name IS NOT NULL AND bph.l3_name = paf.l1_name THEN 1 ELSE 0 END) +
          (CASE WHEN bph.l4_name IS NOT NULL AND bph.l4_name = paf.l2_name THEN 1 ELSE 0 END) +
          (CASE WHEN bph.l5_name IS NOT NULL AND bph.l5_name = paf.l3_name THEN 1 ELSE 0 END)
        ) AS paf_level_exact_match_count,
        (bph.product_code IS NOT NULL AND bph.product_code = ooa.product_code) AS is_direct_product_match,
        (bph.article IS NOT NULL AND bph.article = ooa.article) AS is_direct_article_match,
        CASE UPPER(COALESCE(bph.hierarchy_level, 'L5'))
          WHEN 'L0' THEN 0 WHEN 'L1' THEN 1 WHEN 'L2' THEN 2 WHEN 'L3' THEN 3 WHEN 'L4' THEN 4 ELSE 5
        END AS max_hierarchy_depth,
        (bph.l0_name IS NULL OR bph.l0_name = paf.l0_name) AS l0_ok,
        (bph.l1_name IS NULL OR bph.l1_name = paf.l1_name) AS l1_ok,
        (bph.l2_name IS NULL OR bph.l2_name = paf.l2_name) AS l2_ok,
        (bph.l3_name IS NULL OR bph.l3_name = paf.l1_name) AS l3_ok,
        (bph.l4_name IS NULL OR bph.l4_name = paf.l2_name) AS l4_ok,
        (bph.l5_name IS NULL OR bph.l5_name = paf.l3_name) AS l5_ok,
        (bph.l1_name IS NULL) AS bph_l1_unspecified,
        (bph.l2_name IS NULL) AS bph_l2_unspecified,
        (bph.l3_name IS NULL) AS bph_l3_unspecified,
        (bph.l4_name IS NULL) AS bph_l4_unspecified,
        (bph.l5_name IS NULL) AS bph_l5_unspecified
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
       AND (
            (bph.product_code IS NOT NULL AND bph.product_code = ooa.product_code)
            OR (bph.article IS NOT NULL AND bph.article = ooa.article)
            OR (
              paf.product_code IS NOT NULL
              AND bph.product_code IS NULL
              AND bph.article IS NULL
              AND (
                (
                  (CASE UPPER(COALESCE(bph.hierarchy_level, 'L5'))
                    WHEN 'L0' THEN 0 WHEN 'L1' THEN 1 WHEN 'L2' THEN 2 WHEN 'L3' THEN 3 WHEN 'L4' THEN 4 ELSE 5
                  END) >= 5
                  AND (bph.l0_name IS NULL OR bph.l0_name = paf.l0_name)
                  AND (bph.l1_name IS NULL OR bph.l1_name = paf.l1_name)
                  AND (bph.l2_name IS NULL OR bph.l2_name = paf.l2_name)
                  AND (bph.l3_name IS NULL OR bph.l3_name = paf.l1_name)
                  AND (bph.l4_name IS NULL OR bph.l4_name = paf.l2_name)
                  AND (bph.l5_name IS NULL OR bph.l5_name = paf.l3_name)
                )
                OR (
                  (CASE UPPER(COALESCE(bph.hierarchy_level, 'L5'))
                    WHEN 'L0' THEN 0 WHEN 'L1' THEN 1 WHEN 'L2' THEN 2 WHEN 'L3' THEN 3 WHEN 'L4' THEN 4 ELSE 5
                  END) >= 4
                  AND (bph.l0_name IS NULL OR bph.l0_name = paf.l0_name)
                  AND (bph.l1_name IS NULL OR bph.l1_name = paf.l1_name)
                  AND (bph.l2_name IS NULL OR bph.l2_name = paf.l2_name)
                  AND (bph.l3_name IS NULL OR bph.l3_name = paf.l1_name)
                  AND (bph.l4_name IS NULL OR bph.l4_name = paf.l2_name)
                  AND bph.l5_name IS NULL
                )
                OR (
                  (CASE UPPER(COALESCE(bph.hierarchy_level, 'L5'))
                    WHEN 'L0' THEN 0 WHEN 'L1' THEN 1 WHEN 'L2' THEN 2 WHEN 'L3' THEN 3 WHEN 'L4' THEN 4 ELSE 5
                  END) >= 3
                  AND (bph.l0_name IS NULL OR bph.l0_name = paf.l0_name)
                  AND (bph.l1_name IS NULL OR bph.l1_name = paf.l1_name)
                  AND (bph.l2_name IS NULL OR bph.l2_name = paf.l2_name)
                  AND (bph.l3_name IS NULL OR bph.l3_name = paf.l1_name)
                  AND bph.l4_name IS NULL
                  AND bph.l5_name IS NULL
                )
                OR (
                  (CASE UPPER(COALESCE(bph.hierarchy_level, 'L5'))
                    WHEN 'L0' THEN 0 WHEN 'L1' THEN 1 WHEN 'L2' THEN 2 WHEN 'L3' THEN 3 WHEN 'L4' THEN 4 ELSE 5
                  END) >= 2
                  AND (bph.l0_name IS NULL OR bph.l0_name = paf.l0_name)
                  AND (bph.l1_name IS NULL OR bph.l1_name = paf.l1_name)
                  AND (bph.l2_name IS NULL OR bph.l2_name = paf.l2_name)
                  AND bph.l3_name IS NULL
                  AND bph.l4_name IS NULL
                  AND bph.l5_name IS NULL
                )
                OR (
                  (CASE UPPER(COALESCE(bph.hierarchy_level, 'L5'))
                    WHEN 'L0' THEN 0 WHEN 'L1' THEN 1 WHEN 'L2' THEN 2 WHEN 'L3' THEN 3 WHEN 'L4' THEN 4 ELSE 5
                  END) >= 1
                  AND (bph.l0_name IS NULL OR bph.l0_name = paf.l0_name)
                  AND (bph.l1_name IS NULL OR bph.l1_name = paf.l1_name)
                  AND bph.l2_name IS NULL
                  AND bph.l3_name IS NULL
                  AND bph.l4_name IS NULL
                  AND bph.l5_name IS NULL
                )
                OR (
                  (CASE UPPER(COALESCE(bph.hierarchy_level, 'L5'))
                    WHEN 'L0' THEN 0 WHEN 'L1' THEN 1 WHEN 'L2' THEN 2 WHEN 'L3' THEN 3 WHEN 'L4' THEN 4 ELSE 5
                  END) >= 0
                  AND (bph.l0_name IS NULL OR bph.l0_name = paf.l0_name)
                  AND bph.l1_name IS NULL
                  AND bph.l2_name IS NULL
                  AND bph.l3_name IS NULL
                  AND bph.l4_name IS NULL
                  AND bph.l5_name IS NULL
                )
              )
            )
          )
      WHERE (ooa.is_deleted = false OR ooa.is_deleted IS NULL)
      ) base0
    ) ranked
    INNER JOIN target_allocations ta ON ta.hierarchy_id = ranked.hierarchy_id
    WHERE ranked.match_tier IS NOT NULL
  ),
  best_approved AS (
    SELECT order_id, hierarchy_id, loc_code, fiscal_year_week, fiscal_year_month, order_cost, order_units,
      ROW_NUMBER() OVER (
        PARTITION BY order_id
        ORDER BY match_tier DESC, paf_level_exact_match_count DESC, specificity_score DESC, hierarchy_id ASC
      ) AS rn
    FROM matching_approved
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
    available_budget_cost = CASE
      WHEN EXISTS (
        SELECT 1
        FROM oms.budget_allocation ba_w
        INNER JOIN oms.budget_time_periods btp_w ON ba_w.time_period_id = btp_w.time_period_id
        WHERE ba_w.hierarchy_id = bph.hierarchy_id
          AND btp_w.is_active = true
          AND btp_w.time_period_type = 'WEEK'
      ) AND btp.time_period_type = 'MONTH' THEN
        GREATEST(0, COALESCE(ba.planned_budget_cost, 0))
      ELSE
        GREATEST(0, COALESCE(ba.planned_budget_cost, 0) - COALESCE(c.consumed_cost, 0))
    END,
    available_budget_units = CASE
      WHEN EXISTS (
        SELECT 1
        FROM oms.budget_allocation ba_w
        INNER JOIN oms.budget_time_periods btp_w ON ba_w.time_period_id = btp_w.time_period_id
        WHERE ba_w.hierarchy_id = bph.hierarchy_id
          AND btp_w.is_active = true
          AND btp_w.time_period_type = 'WEEK'
      ) AND btp.time_period_type = 'MONTH' THEN
        GREATEST(0, COALESCE(ba.planned_budget_units, 0))
      ELSE
        GREATEST(0, COALESCE(ba.planned_budget_units, 0) - COALESCE(c.consumed_units, 0))
    END,
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