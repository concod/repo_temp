--liquibase formatted sql
--changeset vishal.kumar@impactanalytics.co:oms_delete_orders_by_filter_cb_1 runOnChange:true stripComments:false splitStatements:false context:MTP-111126 labels:MTP-111126_1
--comment: Bulk delete/reset OMS orders by filter
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.oms_delete_orders_by_filter(jsonb, integer[], text, integer,varchar[]);
DROP FUNCTION IF EXISTS inventory_smart.oms_delete_orders_by_filter(jsonb, integer[], text, integer,varchar[], jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.oms_delete_orders_by_filter(
  p_product_filter jsonb,        -- same as $2 in get_oms_recommended_orders
  p_order_status_ids integer[],  -- same as $4
  p_recommended_all text,        -- same as $6 (unused)
  p_user_id integer,
  unchecked_order_group_ids varchar[],
  meta jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
AS $function$
DECLARE
  v_pa_sql               text := '';
  v_date_filter          text := '';
  v_curr_cycle_filter    text := '';
  v_include_custom_cls   text := '';
  v_base_from_where      text := '';
  v_soft_reset_sql       text := '';
  v_hard_delete_sql      text := '';
  v_delete_approved_sql  text := '';
  v_affected_ids         int[] := ARRAY[]::int[];
  v_date_rec             record;
  v_base_from_where_no_status  text := '';
  v_unchecked_order_group_ids varchar[];
  v_group_filter             text := '';
BEGIN
  -- Build product filter
  v_pa_sql := inventory_smart.form_main_table_filters('ph_master'::text, p_product_filter);

-- Build filter for unchecked order group ids from input array
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


  -- Core FROM/JOIN/WHERE with valid_groups (parity with get_oms_recommended_orders)
  v_base_from_where := '
    FROM inventory_smart.oms_orders_recommended oor
    JOIN (SELECT * FROM global.product_attributes_filter '|| v_pa_sql ||') paf
      ON oor.product_code = paf.product_code
    JOIN global.distribution_centres dc
      ON oor.loc_code = dc.linked_store_code AND NOT dc.is_deleted
    WHERE order_status_id = ANY(''' || CONCAT(p_order_status_ids) || '''::INTEGER[])
    ' || v_group_filter || '
  ';

  IF v_date_filter <> '' THEN
    v_base_from_where := v_base_from_where || ' AND ' || v_date_filter;
  END IF;

  raise notice 'v_base_from_where %',v_base_from_where;
  -- Soft reset: Recommended/Edited/Scenario
  v_soft_reset_sql := '
    UPDATE inventory_smart.oms_orders_recommended oor
       SET is_deleted = false,
           updated_at = now(),
           order_status_id = 0,
           updated_by = '|| p_user_id ||'
     WHERE oor.id IN (
      SELECT oor.id '|| v_base_from_where ||' AND oor.order_gen_type IN (''Recommended'',''Edited'',''Scenario'')
     )';

  -- Hard delete: Manual
  v_hard_delete_sql := '
    DELETE FROM inventory_smart.oms_orders_recommended oor
     WHERE oor.id IN (
      SELECT oor.id '|| v_base_from_where ||' AND oor.order_gen_type = ''Manual''
     )';

  -- Delete approved records: status_id = 3
  -- v_delete_approved_sql := '
  --   DELETE FROM inventory_smart.oms_orders_approved ooa
  --    WHERE ooa.id IN (
  --     SELECT oor.id '|| v_base_from_where ||' AND oor.order_status_id = 3
  --    )';

  raise notice 'v_delete_approved_sql %',v_delete_approved_sql;
  raise notice 'v_soft_reset_sql %',v_soft_reset_sql;
  raise notice 'v_hard_delete_sql %',v_hard_delete_sql;
  
  EXECUTE v_delete_approved_sql;
  EXECUTE v_soft_reset_sql;
  EXECUTE v_hard_delete_sql;

  -- Collect affected IDs
  EXECUTE 'SELECT ARRAY(SELECT DISTINCT oor.id '|| v_base_from_where ||')' INTO v_affected_ids;

  RETURN jsonb_build_object('sku_ids', v_affected_ids);
END;
$function$;