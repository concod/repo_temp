--liquibase formatted sql
--changeset nikhil.madhusudan@impactanalytics.co:oms_update_available_budget_delta_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_3 labels:MTP-91512
--comment: Incremental signed deltas on available_budget_* (CNO / delete / edit flows). DB may go negative; responses should use GREATEST(0,...).
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

  Resolves best-fit hierarchy per row (same matching rules as oms_recalculate_available_budget),
  applies each row's delta to both WEEK and MONTH budget_allocation rows for that hierarchy + period.

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
  receipt_to_fiscal AS (
    SELECT date::date AS receipt_date,
           fiscal_year_week::text AS fiscal_year_week,
           fiscal_year_month::text AS fiscal_year_month
    FROM global.fiscal_date_mapping
  ),
  order_with_fiscal AS (
    SELECT
      ir.input_id,
      ir.loc_code,
      ir.product_code,
      ir.article,
      ir.delta_cost,
      ir.delta_units,
      fdm.fiscal_year_week,
      fdm.fiscal_year_month
    FROM input_rows ir
    JOIN receipt_to_fiscal fdm ON ir.receipt_date = fdm.receipt_date
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
  matching_rows AS (
    SELECT
      owf.input_id,
      owf.delta_cost,
      owf.delta_units,
      bph.hierarchy_id,
      owf.loc_code,
      fdm.fiscal_year_week,
      fdm.fiscal_year_month,
      COALESCE(hr.ranking, -1) AS match_depth
    FROM order_with_fiscal owf
    JOIN receipt_to_fiscal fdm
      ON owf.receipt_date = fdm.receipt_date
    INNER JOIN target_keys tk
      ON owf.loc_code = tk.loc_code
      AND ((tk.time_period_type = 'WEEK' AND fdm.fiscal_year_week = tk.time_period_key)
           OR (tk.time_period_type = 'MONTH' AND fdm.fiscal_year_month = tk.time_period_key))
    LEFT JOIN global.product_attributes_filter paf ON paf.product_code = owf.product_code
    INNER JOIN oms.budget_product_hierarchy bph
      ON bph.loc_code = owf.loc_code
     AND bph.is_active = true
     AND (bph.product_code = owf.product_code
          OR bph.article = owf.article
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
  ),
  best_per_input AS (
    SELECT input_id, delta_cost, delta_units, hierarchy_id, loc_code, fiscal_year_week, fiscal_year_month,
      ROW_NUMBER() OVER (PARTITION BY input_id ORDER BY match_depth DESC) AS rn
    FROM matching_rows
    WHERE match_depth >= -1
  ),
  best AS (
    SELECT input_id, delta_cost, delta_units, hierarchy_id, loc_code, fiscal_year_week, fiscal_year_month
    FROM best_per_input
    WHERE rn = 1
  ),
  period_deltas AS (
    SELECT b.hierarchy_id, b.fiscal_year_week AS time_period_key, 'WEEK'::text AS time_period_type,
           SUM(b.delta_cost) AS d_cost, SUM(b.delta_units) AS d_units
    FROM best b
    WHERE b.fiscal_year_week IS NOT NULL AND b.fiscal_year_week <> ''
    GROUP BY b.hierarchy_id, b.fiscal_year_week
    UNION ALL
    SELECT b.hierarchy_id, b.fiscal_year_month, 'MONTH'::text,
           SUM(b.delta_cost), SUM(b.delta_units)
    FROM best b
    WHERE b.fiscal_year_month IS NOT NULL AND b.fiscal_year_month <> ''
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
    ON btp.time_period_id = ba.time_period_id
   AND btp.is_active = true
   AND btp.time_period_type = pd.time_period_type
   AND btp.time_period_key::text = pd.time_period_key::text
  WHERE ba.hierarchy_id = bph.hierarchy_id
    $q$,
    order_rows_json
  );

  RAISE NOTICE 'oms_update_available_budget_delta final query: %', v_sql;
  EXECUTE v_sql;
END;
$function$
;
