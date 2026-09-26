--liquibase formatted sql
--changeset hari.anjaneyulu@impactanalytics.co:get_oms_recommended_orders_update1 runOnChange:true stripComments:false splitStatements:false context:MTP-136734_1
--comment: Added logic to handle insert when status_id = 3 and update otherwise
--rollback: SELECT 1
DROP FUNCTION IF EXISTS oms.get_oms_recommended_orders_update(jsonb, text, integer[], jsonb, text, boolean, boolean, text, integer, varchar[],integer);
DROP FUNCTION IF EXISTS oms.get_oms_recommended_orders_update(jsonb, text, jsonb, integer[], jsonb, text, boolean, boolean, text, integer, varchar[], integer);
DROP FUNCTION IF EXISTS oms.get_oms_recommended_orders_update(jsonb, jsonb,jsonb, integer[], jsonb, text, boolean, boolean, text, integer, varchar[],integer);
DROP FUNCTION IF EXISTS oms.get_oms_recommended_orders_update(jsonb, jsonb, integer[], jsonb, text, boolean, boolean, text, integer, varchar[],integer);
CREATE OR REPLACE FUNCTION oms.get_oms_recommended_orders_update(
    p_product_filter jsonb,
    p_hierarchy_filter jsonb,
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
  v_product_filter           jsonb := '{}'::jsonb;
  v_hierarchy_json            jsonb := '[]'::jsonb;
  v_meta_cls                 text := '';
  v_include_custom_order     text := '';
  v_date_filter              text := '';
  v_date_rec                 record;
  v_curr_cycle_order         text := '';
  v_action_key               text := '';
  v_status_id                integer := NULL;
  v_base_cte                 text := '';
  v_insert_sql               text := '';
  v_unchecked_order_group_ids varchar[];
  v_group_filter             text := '';
  v_comment                  text:= 'Approved via batch process';
  v_approved_ids             integer[];
  v_updated_group_sql        text := '';
  v_updated_ids              integer[];
  v_hierarchy_key            text := NULL;
BEGIN
  v_product_filter := p_product_filter;
  IF p_hierarchy_filter IS NOT NULL AND p_hierarchy_filter <> '{}'::jsonb THEN
    SELECT e.key,
           CASE WHEN jsonb_typeof(e.value) <> 'array' THEN jsonb_build_array(e.value) ELSE e.value END
      INTO v_hierarchy_key, v_hierarchy_json
    FROM jsonb_each(p_hierarchy_filter) AS e
    WHERE e.key IN ('l0_name', 'l1_name', 'l2_name', 'l3_name', 'primary_vendor_name')
      AND e.value IS NOT NULL AND e.value <> 'null'::jsonb
      AND NOT (jsonb_typeof(e.value) = 'array' AND jsonb_array_length(e.value) = 0)
    ORDER BY e.key
    LIMIT 1;

    IF v_hierarchy_key IS NOT NULL THEN
      IF v_product_filter ? v_hierarchy_key
         AND jsonb_typeof(v_product_filter->v_hierarchy_key) = 'array'
         AND jsonb_array_length(v_product_filter->v_hierarchy_key) > 0 THEN
        v_product_filter := jsonb_set(v_product_filter, ARRAY[v_hierarchy_key, '0', 'values'], v_hierarchy_json, true);
      ELSE
        v_product_filter := v_product_filter || jsonb_build_object(
          v_hierarchy_key,
          jsonb_build_array(jsonb_build_object('type', 'list', 'operator', 'in', 'values', v_hierarchy_json))
        );
      END IF;
    END IF;
  END IF;
  v_pa_sql := oms.form_main_table_filters('ph_master', v_product_filter);
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


  IF NOT p_include_custom THEN
    v_include_custom_order := 'AND oor.order_gen_type IN (''Recommended'', ''Edited'', ''Scenario'',''Manual'')';
  END IF;

  IF p_only_current_cycle THEN
    v_curr_cycle_order := 'AND oor.created_at >= (
      SELECT MAX(created_at)::date FROM oms.oms_orders_recommended WHERE order_gen_type = ''Recommended''
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
    ELSE
      v_meta_cls := '';
    END IF;
  ELSE
    v_meta_cls := '';
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
      FROM oms.oms_orders_recommended oor
      WHERE oor.order_status_id =  ANY($1)
      GROUP BY oor.order_group_id, oor.loc_code
      HAVING SUM(oor.order_quantity) > 0
    ),
    filtered_orders AS (
      SELECT oor.id, oor.product_code, oor.loc_code, oor.order_group_id
      FROM oms.oms_orders_recommended oor
      WHERE oor.order_status_id = ANY($1)
      ' || COALESCE(v_curr_cycle_order, '') || '
      ' || COALESCE(v_include_custom_order, '') || '
      ' || COALESCE(v_date_filter, '') || '
      ' || COALESCE(v_group_filter, '') || '
      ' || CASE WHEN v_meta_cls IS NOT NULL AND v_meta_cls <> '' THEN ' AND ' || v_meta_cls ELSE '' END || '
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
      select id from pre_filtered_data
    ),
    t AS (
      INSERT INTO oms.oms_orders_approved
      (
        id, order_gen_type, product_code, article, size, loc_code, channel, order_type,
         min_order_quantity_sku, max_order_quantity_sku, min_order_quantity_style, max_order_quantity_style, order_multiple,
         vendor_code, rop, grade,
         order_quantity, order_quantity_eaches, pack_id, unit_cost, roq_constrained, roq_unconstrained,
         order_placement_date, order_placement_recom_date, expected_receipt_date, editable_expected_receipt_date,
         rop_ideal, lead_time, effective_lead_time, dc_inv, system_inv,
          inventory_hold, order_status_id, created_by, created_at,
         updated_by, edit_by_date, is_deleted, comment, order_batch_name, reconciliation_id
      )
      SELECT
        oor.id, oor.order_gen_type, oor.product_code,oor.article, oor.size, oor.loc_code, oor.channel, oor.order_type,
         oor.min_order_quantity_sku, oor.max_order_quantity_sku,oor.min_order_quantity_style, oor.max_order_quantity_style, oor.order_multiple,
         oor.vendor_code, oor.rop, oor.grade, oor.order_quantity,
         oor.order_quantity_eaches, oor.pack_id,
         oor.unit_cost, oor.roq_constrained, oor.roq_unconstrained,
         CURRENT_DATE AS order_placement_date, oor.order_placement_recom_date,
         oor.expected_receipt_date::DATE, oor.editable_expected_receipt_date::DATE, oor.rop_ideal, oor.lead_time,
         oor.effective_lead_time, ok.dc_inv, ok.system_inv,
         oor.inventory_hold::int, 3 AS order_status_id,
         ' || p_user_id || ' AS created_by, CURRENT_TIMESTAMP AS created_at,
         NULL AS updated_by, CURRENT_DATE + 28 AS edit_by_date,
         FALSE AS is_deleted, ' || quote_literal(v_comment) || '::text, oor.order_batch_name as order_batch_name,
         CONCAT(
            oor.product_code, ''-'',
            oor.loc_code, ''-'',
            coalesce(oor.channel, ''-''), ''-'',
            coalesce(CURRENT_DATE::text, ''-''), ''-'',
            coalesce(oor.order_placement_recom_date::text, ''-''), ''-'',
            coalesce(oor.order_gen_type, ''-'')
        ) as reconciliation_id
      FROM oms.oms_orders_recommended AS oor
      LEFT JOIN oms.oms_kpi AS ok
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
      UPDATE oms.oms_orders_recommended
      SET is_deleted = TRUE,
          order_placement_date = CURRENT_DATE,
          order_status_id = 3
      WHERE id = ANY(v_approved_ids);

      INSERT INTO oms.oms_orders_approval_hist
      SELECT nextval('oms.oms_orders_approval_hist_id_seq'),
             unnest(v_approved_ids), p_action_id, v_comment, p_user_id, CURRENT_TIMESTAMP;


      v_updated_group_sql := '
        UPDATE oms.oms_orders_recommended oor
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
      -- RAISE NOTICE 'v_updated_ids %', v_updated_ids;
    END IF;

    RETURN v_approved_ids;
  ELSE
    v_recommended_orders_update_sql := v_base_cte || ',
    updated AS (
      UPDATE oms.oms_orders_recommended u
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
