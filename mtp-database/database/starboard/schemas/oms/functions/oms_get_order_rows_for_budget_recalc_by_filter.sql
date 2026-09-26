--liquibase formatted sql
--changeset nikhil.madhusudan@impactanalytics.co:oms_get_order_rows_for_budget_recalc_by_filter_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_3 labels:MTP-91512
--comment: Return OOR rows (loc_code, product_code, article, editable_expected_receipt_date) matching same filter as oms_delete_orders_by_filter, for budget recalc before bulk delete. Recalc (oms_recalculate_available_budget) uses order_quantity (not order_quantity_eaches) for consumed units; target_allocations = all hierarchies for target (loc, period) keys.
--rollback: SELECT 1

DROP FUNCTION IF EXISTS oms.oms_get_order_rows_for_budget_recalc_by_filter(jsonb, _int4, text, int4, _varchar);

CREATE OR REPLACE FUNCTION oms.oms_get_order_rows_for_budget_recalc_by_filter(
  p_product_filter jsonb,
  p_order_status_ids integer[],
  p_recommended_all text,
  p_user_id integer,
  unchecked_order_group_ids character varying[]
)
RETURNS jsonb
LANGUAGE plpgsql
AS $function$
DECLARE
  v_pa_sql          text := '';
  v_date_filter     text := '';
  v_base_from_where text := '';
  v_unchecked_order_group_ids varchar[];
  v_group_filter    text := '';
  v_sql             text;
  v_result          jsonb;
BEGIN
  -- Same filter build as oms_delete_orders_by_filter (parity with get_oms_recommended_orders)
  v_pa_sql := oms.form_main_table_filters('ph_master', p_product_filter);

  IF unchecked_order_group_ids IS NOT NULL AND array_length(unchecked_order_group_ids, 1) > 0 THEN
    v_unchecked_order_group_ids := unchecked_order_group_ids;
  ELSE
    v_unchecked_order_group_ids := '{}';
  END IF;

  IF array_length(v_unchecked_order_group_ids, 1) IS NOT NULL THEN
    SELECT ' AND CONCAT(' ||
            'COALESCE(oor.article, ''''), ' ||
            'COALESCE(oor.order_placement_date::text, ''''), ' ||
            'COALESCE(oor.order_placement_recom_date::text, ''''), ' ||
            'COALESCE(oor.expected_receipt_date::text, ''''), ' ||
            'COALESCE(CASE WHEN oor.order_gen_type = ''Manual'' THEN ''Manual'' ELSE ''Other'' END, '''')' ||
            ') NOT IN (' || string_agg(quote_literal(elem), ',') || ')'
      INTO v_group_filter
    FROM unnest(v_unchecked_order_group_ids) AS elem;
  END IF;

  v_base_from_where := '
    FROM oms.oms_orders_recommended oor
    JOIN (SELECT * FROM global.product_attributes_filter ' || v_pa_sql || ') paf
      ON oor.product_code = paf.product_code
    JOIN global.distribution_centres dc
      ON oor.loc_code = dc.linked_store_code AND NOT dc.is_deleted
    WHERE order_status_id = ANY(''' || CONCAT(p_order_status_ids) || '''::INTEGER[])
    ' || COALESCE(v_group_filter, '') || '
  ';

  IF v_date_filter <> '' THEN
    v_base_from_where := v_base_from_where || ' AND ' || v_date_filter;
  END IF;

  v_sql := '
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        ''loc_code'', sub.loc_code,
        ''product_code'', COALESCE(sub.product_code, ''''),
        ''article'', COALESCE(sub.article, ''''),
        ''editable_expected_receipt_date'', sub.editable_expected_receipt_date::text
      )
    ), ''[]''::jsonb)
    FROM (
      SELECT DISTINCT oor.loc_code, oor.product_code, oor.article, oor.editable_expected_receipt_date
      ' || v_base_from_where || '
      AND oor.editable_expected_receipt_date IS NOT NULL
    ) sub';
  RAISE NOTICE 'oms_get_order_rows_for_budget_recalc_by_filter final query: %', v_sql;
  EXECUTE v_sql INTO v_result;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$function$;
