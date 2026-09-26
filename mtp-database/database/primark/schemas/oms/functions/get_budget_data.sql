--liquibase formatted sql
--changeset mssprakash.yashwanth@impactanalytics.co:get_budget_data_5 runOnChange:true stripComments:false splitStatements:false context:Release_1_3 labels:MTP-91512_5
--comment: Available budget: sum raw allocation values (negatives count), then GREATEST(0, sum) so displayed total is never below zero.
--rollback: SELECT 1

DROP FUNCTION IF EXISTS oms.get_budget_data(text, text[], text[], text[], text[], text);
DROP FUNCTION IF EXISTS oms.get_budget_data(text, text[], text[], text[], text[], text, jsonb);

CREATE OR REPLACE FUNCTION oms.get_budget_data(
  selected_hierarchy text,
  hierarchy_values text[],
  dc_or_channels text[],
  p_fiscal_year_week text[],
  p_fiscal_year_month text[],
  roq_date_option text,
  product_attribute_query jsonb DEFAULT '{}'::jsonb
)
 RETURNS TABLE(hierarchy_value text, dc_or_channel text, planned_budget_units numeric, planned_budget_cost numeric, available_budget_units numeric, available_budget_cost numeric)
 LANGUAGE plpgsql
AS $function$
DECLARE
  paf_hierarchy_condition text := '';
  v_pa_sql text := '';
  dc_name_condition text := '';
  dc_list text := '';
  budget_time_condition text := '';
  budget_sql text := '';
  v_visible boolean := false;
  v_budget_hierarchy_level int := 999;
  v_selected_hierarchy_level int := 999;
  v_has_week_budget boolean := false;
  v_has_month_budget boolean := false;
  v_group_by text := '';
  v_hierarchy_value_select text := '';
  v_month_keys_sql text := '';
BEGIN
  RAISE NOTICE 'get_budget_data called: roq_date_option=%, hierarchy=%, fiscal_week_len=%, fiscal_month_len=%',
    roq_date_option, selected_hierarchy,
    COALESCE(array_length(p_fiscal_year_week, 1), 0),
    COALESCE(array_length(p_fiscal_year_month, 1), 0);

  IF roq_date_option <> 'roq_receipt_date' THEN
    RAISE NOTICE 'get_budget_data: early return (roq_date_option is not roq_receipt_date)';
    RETURN;
  END IF;

  -- Same hierarchy filter as the view: PAF selected_hierarchy IN (hierarchy_values)
  paf_hierarchy_condition := 'paf.' || selected_hierarchy || ' IN (' || array_to_string(
    ARRAY(
      SELECT quote_literal(hierarchy_values[i])
      FROM generate_series(1, array_length(hierarchy_values, 1)) AS i
    ), ', ') || ')';

  -- Full PAF slice like get_oms_high_level_summary_monthly (ph_master / payload product filters)
  v_pa_sql := oms.form_main_table_filters('ph_master', COALESCE(product_attribute_query, '{}'::jsonb));

  -- HLS passes DC names; Matrix summary passes store codes (bph.loc_code / dc.linked_store_code).
  IF dc_or_channels IS NOT NULL AND COALESCE(array_length(dc_or_channels, 1), 0) > 0 THEN
    dc_list := array_to_string(
      ARRAY(
        SELECT quote_literal(dc_or_channels[i])
        FROM generate_series(1, array_length(dc_or_channels, 1)) AS i
      ), ', ');
    dc_name_condition := '(dc.name IN (' || dc_list || ') OR dc.linked_store_code IN (' || dc_list || '))';
  ELSE
    dc_name_condition := 'true';
  END IF;

  -- Use oms.hierarchy_rankings for visibility: show budget when budget grain is at or finer than view grain.
  SELECT
    COALESCE(
      (SELECT MAX(hr_budget.ranking)
       FROM oms.budget_product_hierarchy bph
       LEFT JOIN oms.hierarchy_rankings hr_budget ON hr_budget.hier_level = (
         CASE WHEN bph.hierarchy_level ~ '^L[0-9]+$' THEN LOWER(bph.hierarchy_level) || '_name'
              ELSE LOWER(bph.hierarchy_level) END
       )
       WHERE bph.is_active = true),
      999
    ),
    COALESCE(
      (SELECT MIN(hr_selected.ranking)
       FROM oms.hierarchy_rankings hr_selected
       WHERE hr_selected.hier_level = selected_hierarchy),
      999
    ),
    COALESCE(
      (SELECT BOOL_OR(btp.time_period_type = 'WEEK')
       FROM oms.budget_product_hierarchy bph
       LEFT JOIN oms.budget_allocation ba ON ba.hierarchy_id = bph.hierarchy_id
       LEFT JOIN oms.budget_time_periods btp ON ba.time_period_id = btp.time_period_id AND btp.is_active = true
       WHERE bph.is_active = true),
      false
    ),
    COALESCE(
      (SELECT BOOL_OR(btp.time_period_type = 'MONTH')
       FROM oms.budget_product_hierarchy bph
       LEFT JOIN oms.budget_allocation ba ON ba.hierarchy_id = bph.hierarchy_id
       LEFT JOIN oms.budget_time_periods btp ON ba.time_period_id = btp.time_period_id AND btp.is_active = true
       WHERE bph.is_active = true),
      false
    )
  INTO v_budget_hierarchy_level, v_selected_hierarchy_level, v_has_week_budget, v_has_month_budget;

  -- Week view: only WEEK rows whose time_period_key is in p_fiscal_year_week (no month fallback).
  -- Month view: MONTH rows for p_fiscal_year_month + all WEEK rows whose parent is one of those MONTH rows.
  budget_time_condition := '1=0';
  /* Month-first: callers can pass p_fiscal_year_month + p_fiscal_year_week together for month column + visible weeks. */
  IF p_fiscal_year_month IS NOT NULL AND array_length(p_fiscal_year_month, 1) > 0 THEN
    IF v_has_month_budget OR v_has_week_budget THEN
      v_month_keys_sql := array_to_string(
        ARRAY(
          SELECT quote_literal(p_fiscal_year_month[i])
          FROM generate_series(1, array_length(p_fiscal_year_month, 1)) AS i
        ),
        ', '
      );
      budget_time_condition :=
        '(' ||
        '(btp.time_period_type = ''MONTH'' AND btp.time_period_key IN (' || v_month_keys_sql || ')) OR ' ||
        '(btp.time_period_type = ''WEEK'' AND btp.parent_time_period_id IN (' ||
          'SELECT btp_m.time_period_id FROM oms.budget_time_periods btp_m ' ||
          'WHERE btp_m.is_active = true AND btp_m.time_period_type = ''MONTH'' AND btp_m.time_period_key IN (' || v_month_keys_sql || ')' ||
        '))' ||
        ')';
    END IF;
  ELSIF p_fiscal_year_week IS NOT NULL AND array_length(p_fiscal_year_week, 1) > 0 THEN
    IF v_has_week_budget THEN
      budget_time_condition :=
        'btp.time_period_type = ''WEEK'' AND btp.time_period_key IN (' || array_to_string(
          ARRAY(
            SELECT quote_literal(p_fiscal_year_week[i])
            FROM generate_series(1, array_length(p_fiscal_year_week, 1)) AS i
          ), ', '
        ) || ')';
    END IF;
  END IF;

  v_visible := (
    v_budget_hierarchy_level >= v_selected_hierarchy_level
    AND (
      (p_fiscal_year_week IS NOT NULL AND array_length(p_fiscal_year_week, 1) > 0
        AND v_has_week_budget)
      OR
      (p_fiscal_year_month IS NOT NULL AND array_length(p_fiscal_year_month, 1) > 0 AND (v_has_month_budget OR v_has_week_budget))
    )
  );

  IF NOT v_visible THEN
    RAISE NOTICE 'get_budget_data: early return (v_visible=false) budget_lvl=%, selected_lvl=%, has_week=%, has_month=%',
      v_budget_hierarchy_level, v_selected_hierarchy_level, v_has_week_budget, v_has_month_budget;
    RETURN;
  END IF;

  -- hierarchy_value = full path from l0 to selected level (l0|l1|...|selected) so any difference at any parent level gives a distinct key.
  v_hierarchy_value_select := CASE selected_hierarchy
    WHEN 'l0_name' THEN 'pd.l0_name::text AS hierarchy_value'
    WHEN 'l1_name' THEN '(pd.l0_name::text || ''|'' || pd.l1_name::text) AS hierarchy_value'
    WHEN 'l2_name' THEN '(pd.l0_name::text || ''|'' || pd.l1_name::text || ''|'' || pd.l2_name::text) AS hierarchy_value'
    WHEN 'l3_name' THEN '(pd.l0_name::text || ''|'' || pd.l1_name::text || ''|'' || pd.l2_name::text || ''|'' || pd.l3_name::text) AS hierarchy_value'
    WHEN 'l4_name' THEN '(pd.l0_name::text || ''|'' || pd.l1_name::text || ''|'' || pd.l2_name::text || ''|'' || pd.l3_name::text) AS hierarchy_value'
    ELSE '(pd.l0_name::text || ''|'' || pd.l1_name::text || ''|'' || pd.l2_name::text || ''|'' || pd.l3_name::text) AS hierarchy_value'
  END;

  -- Group by full path up to selected level so one row per (l0..selected, dc).
  v_group_by := CASE selected_hierarchy
    WHEN 'l0_name' THEN 'pd.l0_name'
    WHEN 'l1_name' THEN 'pd.l0_name, pd.l1_name'
    WHEN 'l2_name' THEN 'pd.l0_name, pd.l1_name, pd.l2_name'
    WHEN 'l3_name' THEN 'pd.l0_name, pd.l1_name, pd.l2_name, pd.l3_name'
    WHEN 'l4_name' THEN 'pd.l0_name, pd.l1_name, pd.l2_name, pd.l3_name'
    ELSE 'pd.l0_name, pd.l1_name, pd.l2_name, pd.l3_name'
  END || ', pd.dc_name';

  -- PAF: full product_attribute_query (form_main_table_filters) AND selected_hierarchy slice (same as other OMS SPs).
  budget_sql := '
    WITH paf_filter AS (
      SELECT DISTINCT paf.l0_name, paf.l1_name, paf.l2_name, paf.l3_name
      FROM global.product_attributes_filter paf
      ' || CASE
            WHEN v_pa_sql IS NULL OR btrim(v_pa_sql) = '' THEN 'WHERE ' || paf_hierarchy_condition
            ELSE v_pa_sql
          END || '
    ),
    paf_dc AS (
      SELECT pf.l0_name, pf.l1_name, pf.l2_name, pf.l3_name, dc.name AS dc_name, dc.linked_store_code
      FROM paf_filter pf
      CROSS JOIN global.distribution_centres dc
      WHERE ' || dc_name_condition || ' AND dc.is_active = true
    )
    SELECT
      ' || v_hierarchy_value_select || ',
      pd.dc_name::text AS dc_or_channel,
      SUM(COALESCE(ba.planned_budget_units, 0))::numeric,
      SUM(COALESCE(ba.planned_budget_cost, 0))::numeric,
      GREATEST(0::numeric, SUM(COALESCE(ba.available_budget_units, 0)))::numeric,
      GREATEST(0::numeric, SUM(COALESCE(ba.available_budget_cost, 0)))::numeric
    FROM paf_dc pd
    JOIN oms.budget_product_hierarchy bph
      ON bph.loc_code = pd.linked_store_code
      AND bph.is_active = true
      AND bph.' || selected_hierarchy || ' IS NOT NULL
      AND (bph.l0_name IS NULL OR bph.l0_name = pd.l0_name)
      AND (bph.l1_name IS NULL OR bph.l1_name = pd.l1_name)
      AND (bph.l2_name IS NULL OR bph.l2_name = pd.l2_name)
      AND (bph.l3_name IS NULL OR bph.l3_name = pd.l1_name)
      AND (bph.l4_name IS NULL OR bph.l4_name = pd.l2_name)
      AND (bph.l5_name IS NULL OR bph.l5_name = pd.l3_name)
    JOIN oms.budget_allocation ba ON ba.hierarchy_id = bph.hierarchy_id
    JOIN oms.budget_time_periods btp ON ba.time_period_id = btp.time_period_id AND btp.is_active = true
    WHERE ' || budget_time_condition || '
    GROUP BY ' || v_group_by || '
  ';

  RAISE NOTICE 'get_budget_data final query: %', budget_sql;
  RETURN QUERY EXECUTE budget_sql;
END;
$function$
;
