--liquibase formatted sql
--changeset vishal.kumar@impactanalytics.co:get_oms_recommended_orders_update3 runOnChange:true stripComments:false splitStatements:false context:MTP-121910
--comment: Updated logic to handle insert when status_id = 3 and update otherwise
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_oms_recommended_orders_update(input refcursor, jsonb, jsonb, integer[], jsonb, text, boolean, boolean, text, integer, varchar[],integer);
DROP FUNCTION IF EXISTS inventory_smart.get_oms_recommended_orders_update(jsonb, jsonb, integer[], jsonb, text, boolean, boolean, text, integer, varchar[],integer);

CREATE OR REPLACE FUNCTION inventory_smart.get_oms_recommended_orders_update(
    p_product_filter jsonb,
    p_date_filter jsonb,
    p_status_ids integer[],
    p_meta jsonb,
    p_mode text,
    p_include_custom boolean,
    p_only_current_cycle boolean,
    p_action_key text,
    p_user_id integer,
    unchecked_order_group_ids varchar[],
    p_action_id integer
)
RETURNS integer[]
LANGUAGE plpgsql
AS $function$
DECLARE
  v_pa_sql                   text := '';
  v_recommended_orders_update_sql  text := '';
  v_meta_cls                 text := '';
  v_include_custom_order     text := '';
  v_date_filter              text := '';
  v_date_rec                 record;
  v_curr_cycle_order         text := '';
  v_limit_cls                text := '';
  v_search_cls               text := '';
  v_sort_cls                 text := '';
  limit_json                 jsonb := '{}';
  search_json                jsonb := '{}'; 
  sort_json                  jsonb := '{}';
  v_size_search_cls          text := '';
  v_size_sort_cls            text := '';
  v_order_direction          text := 'ASC';
  v_action_key               text := '';
  v_status_id                integer := NULL;
  v_base_cte                 text := '';
  v_insert_sql               text := '';
  v_unchecked_order_group_ids varchar[];
  v_group_filter             text := '';
  v_action_id                integer := NULL;
  v_comment                  text:= 'Approved via batch process';
  v_approved_ids             integer[];
  v_updated_group_sql        text := '';
  v_updated_ids              integer[];
  v_gen_random_uuid          text := gen_random_uuid()::varchar;
  v_affected_rows            integer := 0;
BEGIN
  -- Build product filter SQL
  v_pa_sql := inventory_smart.form_main_table_filters('ph_master', p_product_filter);
  -- Build filter for unchecked order group ids from input array
  IF unchecked_order_group_ids IS NOT NULL AND array_length(unchecked_order_group_ids, 1) > 0 THEN
    v_unchecked_order_group_ids := unchecked_order_group_ids;
  ELSE
    v_unchecked_order_group_ids := '{}';
  END IF;

  IF array_length(v_unchecked_order_group_ids, 1) IS NOT NULL THEN
    SELECT ' AND CONCAT(' ||
           'COALESCE(oor.article, ''''), ' ||
           'COALESCE(oor.loc_code, ''''), ' ||
           'COALESCE(oor.order_placement_date::text, ''''), ' ||
           'COALESCE(oor.expected_receipt_date::text, ''''), ' ||
           'COALESCE(oor.editable_expected_receipt_date::text, ''''), ' ||
           'COALESCE(CASE WHEN oor.order_gen_type = ''Manual'' THEN ''Manual'' ELSE ''Other'' END, '''')' ||
           ') NOT IN (' || string_agg(quote_literal(elem), ',') || ')'
      INTO v_group_filter
    FROM unnest(v_unchecked_order_group_ids) AS elem;
  END IF;


  IF NOT p_include_custom THEN
    v_include_custom_order := 'AND oor.order_gen_type IN (''Recommended'', ''Edited'', ''Scenario'',''Manual'')';
  END IF;

  IF p_only_current_cycle THEN
    v_curr_cycle_order := 'AND oor.created_at >= (
      SELECT MAX(created_at)::date FROM inventory_smart.oms_orders_recommended WHERE order_gen_type = ''Recommended''
    )';
  END IF;

  FOR v_date_rec IN
    SELECT * FROM jsonb_to_recordset(p_date_filter) AS x(attribute_name text, start_date date, end_date date)
  LOOP
    v_date_filter := v_date_filter || format(' AND oor.%I BETWEEN %L AND %L', v_date_rec.attribute_name, v_date_rec.start_date, v_date_rec.end_date);
  END LOOP;


  -- Process meta filters to extract WHERE clause for use in CTE
  IF p_meta <> '{}' THEN
    v_meta_cls := global.form_table_query(p_meta);
    IF v_meta_cls ~* 'WHERE' THEN
      -- Remove ORDER BY and LIMIT clauses, keep only WHERE clause
      v_meta_cls := regexp_replace(v_meta_cls, '\s+ORDER\s+BY.*$', '', 'i');
      v_meta_cls := regexp_replace(v_meta_cls, '\s+LIMIT.*$', '', 'i');
      -- Extract just the WHERE conditions (remove WHERE keyword)
      v_meta_cls := substring(v_meta_cls FROM 7);
    END IF;
  END IF;

  v_action_key := lower(p_action_key);

  IF v_action_key = 'push_back'  THEN
    v_status_id := -1;
  ELSIF v_action_key = 'send_for_approval_1' THEN
    v_status_id := 1;
  ELSIF v_action_key = 'send_for_approval_2' THEN
    v_status_id := 2;
  END IF;

IF v_action_key = 'approve' THEN   
     p_status_ids := Array[1];
  END IF;

    v_base_cte := '
    WITH valid_groups AS MATERIALIZED (
      SELECT oor.order_group_id, oor.loc_code
      FROM inventory_smart.oms_orders_recommended oor
      WHERE oor.order_status_id =  ANY($1)
      GROUP BY oor.order_group_id, oor.loc_code
      HAVING SUM(oor.order_quantity) > 0
    ),
    filtered_orders AS (
      SELECT oor.id, oor.product_code, oor.loc_code, oor.order_group_id
      FROM inventory_smart.oms_orders_recommended oor
      WHERE oor.order_status_id = ANY($1)
      ' || COALESCE(v_curr_cycle_order, '') || '
      ' || COALESCE(v_include_custom_order, '') || '
      ' || COALESCE(v_date_filter, '') || '
      ' || COALESCE(v_group_filter, '') || '
      ' || CASE WHEN v_meta_cls IS NOT NULL AND btrim(v_meta_cls) <> '' THEN ' AND ' || btrim(v_meta_cls) ELSE '' END || '
    ),
    pre_filtered_data AS (
      SELECT fo.id
      FROM filtered_orders fo
      INNER JOIN (SELECT * FROM global.product_attributes_filter ' || v_pa_sql || ') paf
        ON fo.product_code = paf.product_code
      INNER JOIN global.distribution_centres dc
        ON fo.loc_code = dc.linked_store_code AND NOT dc.is_deleted
      JOIN valid_groups vg
        ON fo.order_group_id = vg.order_group_id AND fo.loc_code = vg.loc_code
    )';

  RAISE NOTICE 'v_base_cte %', v_base_cte;
  IF v_action_key = 'approve' THEN
    RAISE NOTICE 'Performing INSERT for approval orders...';

    v_insert_sql := v_base_cte || ',
    base AS (
      SELECT id FROM pre_filtered_data
    ),
    t AS (
      INSERT INTO inventory_smart.oms_orders_approved
      (
        id, order_gen_type, product_code, article, size, loc_code, order_reason,
         min_order_quantity_sku, max_order_quantity_sku, min_order_quantity_style,
         vendor_code, rop, grade,
         order_quantity, unit_cost, roq_constrained, roq_unconstrained,
         order_placement_date, order_placement_recom_date, expected_receipt_date, editable_expected_receipt_date,
         rop_ideal, lead_time, effective_lead_time, dc_inv, system_inv,
          inventory_hold, order_status_id, created_by, created_at,
         updated_by, edit_by_date, is_deleted, comment, order_batch_name, reconciliation_id, order_type
      )
      SELECT
        oor.id, oor.order_gen_type, oor.product_code,oor.article, oor.size, oor.loc_code, oor.order_reason,
         oor.min_order_quantity_sku, oor.max_order_quantity_sku,oor.min_order_quantity_style,
         oor.vendor_code, oor.rop, oor.grade, oor.order_quantity,
         oor.unit_cost, oor.roq_constrained, oor.roq_unconstrained,
         CURRENT_DATE AS order_placement_date, oor.order_placement_recom_date,
         oor.expected_receipt_date::DATE, oor.editable_expected_receipt_date::DATE, oor.rop_ideal, oor.lead_time,
         oor.effective_lead_time, ok.dc_inv, ok.system_inv,
         oor.inventory_hold::int, 3 AS order_status_id,
         ' || p_user_id || ' AS created_by, CURRENT_TIMESTAMP AS created_at,
         NULL AS updated_by, CURRENT_DATE + 28 AS edit_by_date,
         FALSE AS is_deleted, ' || quote_literal(v_comment) || '::text,
        oor.order_batch_name as order_batch_name,
         CONCAT(oor.product_code, ''-'', oor.loc_code, ''-'', coalesce(oor.channel,''-'')) as reconciliation_id,
         oor.order_type
      FROM inventory_smart.oms_orders_recommended AS oor
      LEFT JOIN inventory_smart.oms_kpi AS ok
        ON oor.product_code = ok.product_code
      LEFT JOIN base AS b
        ON b.id = oor.id
      WHERE oor.order_quantity > 0 AND oor.id IN (SELECT id FROM pre_filtered_data)
      ON CONFLICT DO NOTHING
      RETURNING oms_orders_approved.id
    )
    SELECT COALESCE(array_agg(id)::integer[], ARRAY[]::integer[]) AS approved_ids
    FROM t;';
    -- Execute insert and collect IDs
    RAISE NOTICE 'v_insert_sql %', v_insert_sql;
    EXECUTE v_insert_sql INTO v_approved_ids USING p_status_ids;
    RAISE NOTICE 'v_approved_ids after insert %', v_approved_ids;

    IF v_approved_ids IS NOT NULL AND array_length(v_approved_ids, 1) > 0 THEN
      UPDATE inventory_smart.oms_orders_recommended
      SET is_deleted = TRUE,
          order_placement_date = CURRENT_DATE,
          order_status_id = 3
      WHERE id = ANY(v_approved_ids);

      INSERT INTO inventory_smart.oms_orders_approval_hist
      SELECT nextval('inventory_smart.oms_orders_approval_hist_id_seq'),
             unnest(v_approved_ids), p_action_id, v_comment, p_user_id, CURRENT_TIMESTAMP;


      v_updated_group_sql := '
        UPDATE inventory_smart.oms_orders_recommended oor
        SET order_group_id = MD5(
          CONCAT(
            COALESCE(paf.article, ''''),
            COALESCE(oor.order_placement_date::text, ''''),
            COALESCE(oor.order_placement_recom_date::text, ''''),
            CASE WHEN oor.order_status_id = 0 THEN TRUE::text ELSE FALSE::text END
          )
        )
        FROM (SELECT DISTINCT article FROM global.product_attributes_filter) paf
        WHERE oor.article = paf.article
          AND oor.id = ANY($1)
        RETURNING oor.id;
      ';
      RAISE NOTICE 'v_updated_group_sql %', v_updated_group_sql;
      EXECUTE v_updated_group_sql USING v_approved_ids;
      RAISE NOTICE 'v_updated_ids %', v_updated_ids;
    END IF;

    --PERFORM global.sp_log(v_gen_random_uuid, 'inventory_smart.get_oms_recommended_orders_update', 'Inserted Approved Orders', NULL, input);

    -- OPEN input FOR SELECT unnest(v_updated_ids) AS updated_ids;
    RETURN v_approved_ids;
  ELSE
    v_recommended_orders_update_sql := v_base_cte || ',
    updated AS (
      UPDATE inventory_smart.oms_orders_recommended u
      SET order_status_id = ' || v_status_id || '
      FROM pre_filtered_data s
      WHERE u.id = s.id
      RETURNING u.id
    )
    SELECT COALESCE(array_agg(id)::integer[], ARRAY[]::integer[]) AS updated_ids
    FROM updated';

    RAISE NOTICE 'Executing update SQL: %', v_recommended_orders_update_sql;

    EXECUTE v_recommended_orders_update_sql INTO v_updated_ids USING p_status_ids;
    RETURN v_updated_ids;
  END IF;
END;
$function$;
