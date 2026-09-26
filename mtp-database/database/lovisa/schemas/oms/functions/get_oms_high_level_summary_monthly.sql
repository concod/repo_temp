--liquibase formatted sql
--changeset mssprakash.yashwanth@impactanalytics.co:get_oms_high_level_summary_monthly_8 runOnChange:true stripComments:false splitStatements:false context:Release_1_3 labels:MTP-132980-1
--comment: MTP-99391
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_oms_high_level_summary_monthly(refcursor, text, text[], text[], text, text);
DROP FUNCTION IF EXISTS inventory_smart.get_oms_high_level_summary_monthly(refcursor, text, text[], text[], text, text, jsonb);
DROP FUNCTION IF EXISTS inventory_smart.get_oms_high_level_summary_monthly(refcursor, text, text[], text[], text, text, jsonb, text[]);
DROP FUNCTION IF EXISTS inventory_smart.get_oms_high_level_summary_monthly(refcursor, text, text[], text[], text, text, jsonb, text[], text[], jsonb, text);
DROP FUNCTION IF EXISTS inventory_smart.get_oms_high_level_summary_monthly(refcursor, text, text[], text[], text, text, jsonb, text[], text[], text, jsonb, text);

CREATE OR REPLACE FUNCTION inventory_smart.get_oms_high_level_summary_monthly(input refcursor, selected_hierarchy text, hierarchy_values text[], dc_or_channels text[], start_date text, end_date text, product_attribute_query jsonb, fiscal_year_week text[],  fiscal_year_month text[], suffix text, view_by_allowed_values jsonb, roq_date_option text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
  v_high_level_summary_monthly_sql  text := '';
  hierarchy_condition               text := '';
  dc_name_condition                 text := '';
  fiscal_condition                 text := '';
  fiscal_condition_oor             text := '';
  fiscal_condition_fdm             text := '';
  v_day                            text := '';
  v_month                           text := '';
  v_year                            text := '';
  v_suffix                          text := '';
  v_pa_sql                          text := '';
  v_loc_filter                      text := '';
  v_product_filter_for_pa           jsonb;
begin
  IF jsonb_array_length((product_attribute_query->'linked_store_codes')->0->'values') > 0 THEN
    SELECT ' AND linked_store_code = ANY(ARRAY[' || string_agg(quote_literal(elem::text), ',') || ']::text[])'
      INTO v_loc_filter
      FROM jsonb_array_elements_text((product_attribute_query->'linked_store_codes')->0->'values') AS elem;
  END IF;
  v_product_filter_for_pa := product_attribute_query - 'linked_store_codes';

  v_suffix = '_' || suffix;

  hierarchy_condition := 'paf.' || selected_hierarchy || ' IN (' || array_to_string(
    ARRAY(
      SELECT quote_literal(hierarchy_values[i])
      FROM generate_series(1, array_length(hierarchy_values, 1)) AS i
    ), ', ') || ')';

  dc_name_condition := 'dc.name IN (' || array_to_string(
    ARRAY(
      SELECT quote_literal(dc_or_channels[i])
      FROM generate_series(1, array_length(dc_or_channels, 1)) AS i
    ), ', ') || ')';

  fiscal_condition := (
    CASE
        WHEN fiscal_year_week IS NOT NULL AND array_length(fiscal_year_week, 1) > 0 THEN
            'fiscal_year_week IN (' || array_to_string(
                ARRAY(
                    SELECT quote_literal(fiscal_year_week[i])
                    FROM generate_series(1, array_length(fiscal_year_week, 1)) AS i
                ), ', '
            ) || ')'
        WHEN fiscal_year_month IS NOT NULL AND array_length(fiscal_year_month, 1) > 0 THEN
            'fiscal_year_month IN (' || array_to_string(
                ARRAY(
                    SELECT quote_literal(fiscal_year_month[i])
                    FROM generate_series(1, array_length(fiscal_year_month, 1)) AS i
                ), ', '
            ) || ')'
        ELSE
            '1=0'
    END
  );

  fiscal_condition_oor := 'oor.' || fiscal_condition;
  fiscal_condition_fdm := 'fdm.' || fiscal_condition;

  v_pa_sql := inventory_smart.form_main_table_filters(
    'ph_master',
    v_product_filter_for_pa
  );

  v_high_level_summary_monthly_sql := '
  WITH paf AS MATERIALIZED (
    SELECT DISTINCT ON (l4_name)
      ' || selected_hierarchy || ',
      l4_name AS product_code,
      cost
    FROM global.product_attributes_filter paf
    ' || v_pa_sql || '
      AND ordering = ''Y''
      AND ' || hierarchy_condition || '
    ORDER BY l4_name
  ),

  oor_base AS MATERIALIZED (
    SELECT
      oor.product_code,
      oor.loc_code,
      oor.order_status_id,
      oor.order_quantity,
      oor.raw_roq,
      oor.roq_unconstrained,
      oor.roq_constrained,
      oor.ia_shipment_order_quantity
    FROM inventory_smart.oms_orders_recommended oor
    WHERE ' || fiscal_condition_oor || '
  ),

  oor_agg AS (
    SELECT
      base.product_code,
      base.loc_code,
      -- status id 1: pending
      SUM(base.order_quantity) FILTER (WHERE base.order_status_id = 1) AS pending_oq,
      SUM(paf.cost * base.order_quantity) FILTER (WHERE base.order_status_id = 1) AS pending_cost,
      SUM(base.ia_shipment_order_quantity) AS soq,
      SUM(paf.cost * base.ia_shipment_order_quantity) AS soq_cost,
      -- status id -1: review
      SUM(base.order_quantity) FILTER (WHERE base.order_status_id = -1) AS review_oq,
      SUM(paf.cost * base.order_quantity) FILTER (WHERE base.order_status_id = -1) AS review_cost,
      -- status id 0: approved
      SUM(base.raw_roq) FILTER (WHERE base.order_status_id = 0) AS raw_roq,
      SUM(paf.cost * base.raw_roq) FILTER (WHERE base.order_status_id = 0) AS raw_roq_cost,
      SUM(base.roq_unconstrained) FILTER (WHERE base.order_status_id = 0) AS roq_uncon,
      SUM(paf.cost * base.roq_unconstrained) FILTER (WHERE base.order_status_id = 0) AS roq_uncon_cost,
      SUM(base.roq_constrained) FILTER (WHERE base.order_status_id = 0) AS roq_con,
      SUM(paf.cost * base.roq_constrained) FILTER (WHERE base.order_status_id = 0) AS roq_con_cost,
      SUM(base.order_quantity) FILTER (WHERE base.order_status_id = 0) AS approved_pending_oq,
      SUM(paf.cost * base.order_quantity) FILTER (WHERE base.order_status_id = 0) AS approved_pending_cost,
      -- final roq
      SUM(base.order_quantity) AS final_roq,
      SUM(paf.cost * base.order_quantity) AS final_roq_cost
    FROM oor_base base
    JOIN paf paf ON paf.product_code = base.product_code
    GROUP BY 1, 2
  ),

  otb AS (
    SELECT
      oo.product_code,
      oo.loc_code,
      SUM(oo.otb) AS otb_sum,
      SUM(paf.cost * oo.otb) AS otb_cost,
      SUM(oo.mfp_units) AS mfp_sum,
      SUM(paf.cost * oo.mfp_units) AS mfp_cost
    FROM inventory_smart.oms_otb oo
    JOIN paf paf ON paf.product_code = oo.product_code
    join inventory_smart.oms_orders_recommended oor 
    on oor.product_code = oo.product_code and oor.channel = oo.channel and oor.fiscal_year_week = oo.fiscal_year_week
    WHERE oo.fiscal_year_week IN (SELECT DISTINCT fiscal_year_week FROM global.fiscal_date_mapping WHERE ' || fiscal_condition || ')
    GROUP BY 1, 2
  ),

  opm AS (
    SELECT
      opm.product_code,
      opm.loc_code,
      SUM(COALESCE(opm.it, 0) + COALESCE(opm.oo, 0)) AS io_sum,
      SUM(paf.cost * (COALESCE(opm.it, 0) + COALESCE(opm.oo, 0))) AS io_cost
    FROM inventory_smart.oms_po_master opm
    JOIN global.fiscal_date_mapping fdm
      ON opm.projected_delivery_date = fdm.date
     AND ' || fiscal_condition_fdm || '
    JOIN paf paf ON paf.product_code = opm.product_code
    GROUP BY 1, 2
  ),

  ooa AS (
    SELECT
      ooa.product_code,
      ooa.loc_code,
      SUM(ooa.order_quantity) AS oq_sum,
      SUM(paf.cost * ooa.order_quantity) AS oq_cost
    FROM inventory_smart.oms_orders_approved ooa
    JOIN global.fiscal_date_mapping fdm
      ON ooa.order_placement_recom_date = fdm.date
     AND ' || fiscal_condition_fdm || '
    JOIN paf paf ON paf.product_code = ooa.product_code
    WHERE NOT ooa.is_deleted
      AND ooa.created_at::date = CURRENT_DATE
    GROUP BY 1, 2
  ),

  sku_dc_mapping AS (
    SELECT DISTINCT
      o.product_code,
      o.loc_code,
      paf.' || selected_hierarchy || ',
      dc.name AS dc_or_channel
    FROM (
      SELECT product_code, loc_code FROM oor_base
      UNION ALL
      SELECT product_code, loc_code FROM ooa
      UNION ALL
      SELECT product_code, loc_code FROM opm
    ) o
    JOIN paf paf ON paf.product_code = o.product_code
    JOIN (SELECT linked_store_code, name FROM global.distribution_centres WHERE is_active AND NOT is_deleted' || v_loc_filter || ') dc ON o.loc_code = dc.linked_store_code
  )

  SELECT
    s.' || selected_hierarchy || ',
    s.dc_or_channel,
    COALESCE(SUM(opm.io_sum), 0) AS committed_orders' || v_suffix || ',
    COALESCE(SUM(opm.io_cost), 0) AS committed_orders_cost' || v_suffix || ',
    COALESCE(SUM(o.pending_oq), 0) AS pending_orders' || v_suffix || ',
    COALESCE(SUM(o.pending_cost), 0) AS pending_orders_cost' || v_suffix || ',
    COALESCE(SUM(o.review_oq), 0) AS orders_under_review' || v_suffix || ',
    COALESCE(SUM(o.review_cost), 0) AS orders_under_review_cost' || v_suffix || ',
    COALESCE(SUM(o.soq), 0) AS ia_shipment_order_quantity' || v_suffix || ',
    COALESCE(SUM(o.soq_cost), 0) AS ia_shipment_order_quantity_cost' || v_suffix || ',
    COALESCE(SUM(o.roq_uncon), 0) AS unconstrained_recom' || v_suffix || ',
    COALESCE(SUM(o.roq_uncon_cost), 0) AS unconstrained_recom_cost' || v_suffix || ',
    COALESCE(SUM(o.roq_con), 0) AS constrained_recom' || v_suffix || ',
    COALESCE(SUM(o.roq_con_cost), 0) AS constrained_recom_cost' || v_suffix || ',
    COALESCE(SUM(o.raw_roq), 0) AS raw_roq' || v_suffix || ',
    COALESCE(SUM(o.raw_roq_cost), 0) AS raw_roq_cost' || v_suffix || ',
    COALESCE(SUM(o.final_roq), 0) AS final_roq' || v_suffix || ',
    COALESCE(SUM(o.final_roq_cost), 0) AS final_roq_cost' || v_suffix || ',
    COALESCE(SUM(o.approved_pending_oq), 0) AS approved_orders_pending_reconciliation' || v_suffix || ',
    COALESCE(SUM(o.approved_pending_cost), 0) AS approved_orders_pending_reconciliation_cost' || v_suffix || ',
    COALESCE(SUM(ooa.oq_sum), 0) AS todays_app_orders' || v_suffix || ',
    COALESCE(SUM(ooa.oq_cost), 0) AS todays_app_orders_cost' || v_suffix || ',
    COALESCE(SUM(otb.otb_sum), 0) AS otb' || v_suffix || ',
    COALESCE(SUM(otb.otb_cost), 0) AS otb_cost' || v_suffix || ',
    COALESCE(SUM(otb.mfp_sum), 0) AS receipt_plan' || v_suffix || ',
    COALESCE(SUM(otb.mfp_cost), 0) AS receipt_plan_cost' || v_suffix || '
  FROM sku_dc_mapping s
  LEFT JOIN oor_agg o USING (product_code, loc_code)
  LEFT JOIN opm USING (product_code, loc_code)
  LEFT JOIN ooa USING (product_code, loc_code)
  LEFT JOIN otb USING (product_code, loc_code)
  GROUP BY 1, 2
  ';

   raise notice 'v_high_level_summary_monthly_sql %',v_high_level_summary_monthly_sql;
   open $1 for execute v_high_level_summary_monthly_sql;
   RETURN v_high_level_summary_monthly_sql;
 end
 $function$
;
