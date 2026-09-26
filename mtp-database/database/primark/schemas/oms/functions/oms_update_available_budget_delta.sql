--liquibase formatted sql
--changeset nikhil.madhusudan@impactanalytics.co:oms_update_available_budget_delta_9 runOnChange:true stripComments:false splitStatements:false context:Release_1_3 labels:MTP-91512
--comment: Incremental signed deltas on available_budget_* (CNO / delete / edit). PAF cascade L5→L0: tier k requires bph not to fix levels below bucket depth (e.g. L4 tier needs bph.l5_name IS NULL) so a row with a different non-null L5 is not an L4 roll-up. Tie-break match_tier, paf exact count, specificity, hierarchy_id. WEEK vs MONTH grain per hierarchy as before.
--rollback: SELECT 1

DROP FUNCTION IF EXISTS oms.oms_update_available_budget_delta(jsonb);

CREATE OR REPLACE FUNCTION oms.oms_update_available_budget_delta(order_rows_json jsonb DEFAULT NULL::jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
/*
  Incremental update of available_budget_cost and available_budget_units on oms.budget_allocation.

  Input JSON array elements:
    loc_code, product_code, article, editable_expected_receipt_date,
    delta_cost, delta_units  (signed: negative = consume budget, positive = release / add back)

  Resolves one hierarchy per input: bph vs PAF (product_code/article when set; else cascade L5→L0). Coarser
  tier k requires bph not to set finer levels (e.g. L4 tier needs bph.l5_name IS NULL) so a wrong L5 leaf row
  is not used as an L4 roll-up. Tie-break: match_tier, PAF exact level count, specificity, hierarchy_id.

  Time grain (per hierarchy_id): if any WEEK budget_allocation exists for that hierarchy, apply
  deltas only to WEEK rows; otherwise apply only to MONTH rows. Matches get_budget_data / matrix
  month view, which sums MONTH + all WEEK rows under the month — updating both grains would
  double-apply the same consumption.

  For full recompute (Planned − consumed), use oms.oms_recalculate_available_budget instead.
*/
DECLARE
  v_sql text;
BEGIN
  IF order_rows_json IS NULL OR jsonb_array_length(order_rows_json) = 0 THEN
    RETURN;
  END IF;

  v_sql := format(
    $q$
  WITH input_rows AS (
    SELECT
      row_number() OVER () AS input_id,
      NULLIF(TRIM(elem->>'loc_code'), '')::text AS loc_code,
      NULLIF(TRIM(elem->>'product_code'), '')::text AS product_code,
      NULLIF(TRIM(elem->>'article'), '')::text AS article,
      (elem->>'editable_expected_receipt_date')::date AS receipt_date,
      COALESCE((elem->>'delta_cost')::numeric, 0) AS delta_cost,
      COALESCE((elem->>'delta_units')::numeric, 0) AS delta_units
    FROM jsonb_array_elements(%L::jsonb) AS elem
    WHERE NULLIF(TRIM(elem->>'loc_code'), '') IS NOT NULL
      AND (elem->>'editable_expected_receipt_date') IS NOT NULL
  ),
  order_with_fiscal AS (
    SELECT
      ir.input_id,
      ir.loc_code,
      ir.product_code,
      ir.article,
      ir.receipt_date,
      ir.delta_cost,
      ir.delta_units,
      fdm.fiscal_year_week,
      fdm.fiscal_year_month
    FROM input_rows ir
    JOIN global.fiscal_date_mapping fdm ON ir.receipt_date = fdm.date::date
    WHERE (fdm.fiscal_year_week IS NOT NULL OR fdm.fiscal_year_month IS NOT NULL)
  ),
  target_keys AS (
    SELECT DISTINCT loc_code, 'WEEK'::text AS time_period_type, fiscal_year_week::text AS time_period_key
    FROM order_with_fiscal
    WHERE fiscal_year_week IS NOT NULL AND NULLIF(BTRIM(fiscal_year_week::text), '') IS NOT NULL
    UNION
    SELECT DISTINCT loc_code, 'MONTH'::text, fiscal_year_month::text
    FROM order_with_fiscal
    WHERE fiscal_year_month IS NOT NULL AND NULLIF(BTRIM(fiscal_year_month::text), '') IS NOT NULL
    UNION
    SELECT DISTINCT owf.loc_code, 'WEEK'::text, fdm.fiscal_year_week::text AS time_period_key
    FROM order_with_fiscal owf
    INNER JOIN global.fiscal_date_mapping fdm
      ON fdm.fiscal_year_month::text = owf.fiscal_year_month::text
    WHERE owf.fiscal_year_month IS NOT NULL
      AND fdm.fiscal_year_week IS NOT NULL
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
  matching_rows AS (
    SELECT
      ranked.input_id,
      ranked.delta_cost,
      ranked.delta_units,
      ranked.hierarchy_id,
      ranked.loc_code,
      ranked.fiscal_year_week,
      ranked.fiscal_year_month,
      ranked.specificity_score,
      ranked.paf_level_exact_match_count,
      ranked.match_tier
    FROM (
      SELECT
        base0.input_id,
        base0.delta_cost,
        base0.delta_units,
        base0.hierarchy_id,
        base0.loc_code,
        base0.fiscal_year_week,
        base0.fiscal_year_month,
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
        owf.input_id,
        owf.delta_cost,
        owf.delta_units,
        bph.hierarchy_id,
        owf.loc_code,
        fdm.fiscal_year_week,
        fdm.fiscal_year_month,
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
        (bph.product_code IS NOT NULL AND bph.product_code = owf.product_code) AS is_direct_product_match,
        (bph.article IS NOT NULL AND bph.article = owf.article) AS is_direct_article_match,
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
      FROM order_with_fiscal owf
      INNER JOIN global.fiscal_date_mapping fdm
        ON owf.receipt_date = fdm.date::date
      INNER JOIN target_keys tk
        ON owf.loc_code = tk.loc_code
        AND ((tk.time_period_type = 'WEEK' AND fdm.fiscal_year_week::text = tk.time_period_key)
             OR (tk.time_period_type = 'MONTH' AND fdm.fiscal_year_month::text = tk.time_period_key))
      LEFT JOIN global.product_attributes_filter paf ON paf.product_code = owf.product_code
      INNER JOIN oms.budget_product_hierarchy bph
        ON bph.loc_code = owf.loc_code
       AND bph.is_active = true
       AND (
            (bph.product_code IS NOT NULL AND bph.product_code = owf.product_code)
            OR (bph.article IS NOT NULL AND bph.article = owf.article)
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
      ) base0
    ) ranked
    INNER JOIN target_allocations ta ON ta.hierarchy_id = ranked.hierarchy_id
    WHERE ranked.match_tier IS NOT NULL
  ),
  best_per_input AS (
    SELECT input_id, delta_cost, delta_units, hierarchy_id, loc_code, fiscal_year_week, fiscal_year_month,
      ROW_NUMBER() OVER (
        PARTITION BY input_id
        ORDER BY match_tier DESC, paf_level_exact_match_count DESC, specificity_score DESC, hierarchy_id ASC
      ) AS rn
    FROM matching_rows
  ),
  best AS (
    SELECT input_id, delta_cost, delta_units, hierarchy_id, loc_code, fiscal_year_week, fiscal_year_month
    FROM best_per_input
    WHERE rn = 1
  ),
  hierarchy_has_week_allocation AS (
    SELECT DISTINCT ba.hierarchy_id
    FROM oms.budget_allocation ba
    INNER JOIN oms.budget_time_periods btp ON ba.time_period_id = btp.time_period_id
    WHERE btp.is_active = true AND btp.time_period_type = 'WEEK'
  ),
  period_deltas AS (
    SELECT b.hierarchy_id, b.fiscal_year_week AS time_period_key, 'WEEK'::text AS time_period_type,
           SUM(b.delta_cost) AS d_cost, SUM(b.delta_units) AS d_units
    FROM best b
    INNER JOIN hierarchy_has_week_allocation hwa ON hwa.hierarchy_id = b.hierarchy_id
    WHERE b.fiscal_year_week IS NOT NULL AND NULLIF(BTRIM(b.fiscal_year_week::text), '') IS NOT NULL
    GROUP BY b.hierarchy_id, b.fiscal_year_week
    UNION ALL
    SELECT b.hierarchy_id, b.fiscal_year_month, 'MONTH'::text,
           SUM(b.delta_cost), SUM(b.delta_units)
    FROM best b
    LEFT JOIN hierarchy_has_week_allocation hwa ON hwa.hierarchy_id = b.hierarchy_id
    WHERE hwa.hierarchy_id IS NULL
      AND b.fiscal_year_month IS NOT NULL AND NULLIF(BTRIM(b.fiscal_year_month::text), '') IS NOT NULL
    GROUP BY b.hierarchy_id, b.fiscal_year_month
  )
  UPDATE oms.budget_allocation ba
  SET
    available_budget_cost = COALESCE(ba.available_budget_cost, 0) + COALESCE(pd.d_cost, 0),
    available_budget_units = COALESCE(ba.available_budget_units, 0) + COALESCE(pd.d_units, 0),
    updated_at = CURRENT_TIMESTAMP
  FROM period_deltas pd
  INNER JOIN oms.budget_product_hierarchy bph
    ON pd.hierarchy_id = bph.hierarchy_id AND bph.is_active = true
  INNER JOIN oms.budget_time_periods btp
    ON btp.is_active = true
   AND btp.time_period_type = pd.time_period_type
   AND btp.time_period_key::text = pd.time_period_key::text
  WHERE ba.hierarchy_id = bph.hierarchy_id
    AND ba.time_period_id = btp.time_period_id
    $q$,
    order_rows_json
  );

  RAISE NOTICE 'oms_update_available_budget_delta final query: %', v_sql;
  EXECUTE v_sql;
END;
$function$
;
