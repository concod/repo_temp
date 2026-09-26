--liquibase formatted sql
--changeset vishal.kumar@impactanalytics.co:oms_delete_orders_by_filter_cb_3 runOnChange:true stripComments:false splitStatements:false context:MTP-111126 labels:MTP-111126_1_4
--comment: Bulk delete/reset OMS orders by filter
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.oms_delete_orders_by_filter(jsonb, jsonb, integer[],  jsonb,  text,  boolean,  boolean,  integer);
DROP FUNCTION IF EXISTS inventory_smart.oms_delete_orders_by_filter(jsonb, integer[], text, integer,varchar[]);
DROP FUNCTION IF EXISTS inventory_smart.oms_delete_orders_by_filter(jsonb, integer[], text, integer,varchar[], jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.oms_delete_orders_by_filter(
  p_product_filter jsonb,        -- same as $2 in get_oms_recommended_orders
  p_order_status_ids integer[],  -- same as $4
  p_recommended_all text,        -- same as $6 (unused)
  p_user_id integer,
  unchecked_order_group_ids varchar[],
  p_meta jsonb DEFAULT '{}'::jsonb
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
  v_meta_cls                 text := '';
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
    SELECT ' AND CONCAT(oor.article, oor.loc_code, oor.order_placement_date, oor.expected_receipt_date, oor.editable_expected_receipt_date, oor.order_gen_type' ||
           ') NOT IN (' || string_agg(quote_literal(elem), ',') || ')'
      INTO v_group_filter
    FROM unnest(v_unchecked_order_group_ids) AS elem;
  END IF;

    -- Process meta filters (search/range) to extract WHERE clause
  IF p_meta IS NOT NULL AND p_meta <> '{}' THEN
    v_meta_cls := global.form_table_query(p_meta);
    IF v_meta_cls ~* 'WHERE' THEN
      v_meta_cls := regexp_replace(v_meta_cls, '\s+ORDER\s+BY.*$', '', 'i');
      v_meta_cls := regexp_replace(v_meta_cls, '\s+LIMIT.*$', '', 'i');
      v_meta_cls := substring(v_meta_cls FROM 7);
    ELSE
      v_meta_cls := '';
    END IF;
    v_meta_cls := REPLACE(v_meta_cls, 'article', 'oor.article');
  ELSE
    v_meta_cls := '';
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

  IF v_meta_cls <> '' THEN
    v_base_from_where := v_base_from_where || ' AND ' || v_meta_cls;
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