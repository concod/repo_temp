--liquibase formatted sql
--changeset mss.prakashyashwanth@impactanalytics.co:get_oms_alert_recommended_orders_details_figs_7  runOnChange:true stripComments:false splitStatements:false context:MTP-114283 labels:MTP-114283
--comment: changed v_filter_reviewed_orders from $3 to $4

DROP FUNCTION IF EXISTS inventory_smart.get_oms_alert_recommended_orders_details(input refcursor, jsonb, jsonb);
DROP FUNCTION IF EXISTS inventory_smart.get_oms_alert_recommended_orders_details(jsonb, jsonb, boolean, boolean);

CREATE OR REPLACE FUNCTION inventory_smart.get_oms_alert_recommended_orders_details(jsonb, jsonb, boolean, filter_reviewed_orders boolean)
RETURNS TABLE(result jsonb)
LANGUAGE plpgsql
AS $function$
DECLARE
  v_pa_sql              TEXT := '';
  v_recommended_orders_sql  TEXT := '';
  v_week_start_date     DATE := date_trunc('week', current_date)::date;
  v_limit_cls           TEXT := '';
  v_search_cls          TEXT := '';
  v_sort_cls            TEXT := '';
  limit_json            JSONB := '{}';
  search_json           JSONB := '{}';
  sort_json             JSONB := '{}';
  new_sort_array        JSONB := '[]'::jsonb;
  size_sort_array       JSONB := '[]'::jsonb;
  new_search_array      JSONB := '[]'::jsonb;
  sort_array            JSONB := '[]'::jsonb;
  size_search_array     JSONB := '[]'::jsonb;
  search_array          JSONB := '[]'::jsonb;
  sort_item             JSONB := '{}';
  search_item           JSONB := '{}';
  size_sort             JSONB := '{}';
  size_search           JSONB := '{}';
  v_size_search_cls     TEXT := '';
  v_size_sort_cls       TEXT := '';
  v_filter_reviewed_orders boolean := false;

BEGIN
  v_pa_sql := inventory_smart.form_main_table_filters('ph_master', $1);
  search_json := $2;
  v_filter_reviewed_orders := $4;
  IF $2 <> '{}' AND $2 -> 'limit' IS NOT NULL THEN
    limit_json := $2 -> 'limit';
    search_json := search_json - 'limit';
    v_limit_cls := global.form_table_query(jsonb_build_object('limit', limit_json));
  END IF;

  IF search_json <> '{}' AND search_json -> 'sort' IS NOT NULL THEN
    sort_array := search_json -> 'sort';
    RAISE NOTICE 'sorted array %', sort_array;

    FOR i IN 0 .. jsonb_array_length(sort_array) - 1 LOOP
      sort_item := sort_array -> i;
      IF sort_item ->> 'column' = 'size' THEN
      sort_item := jsonb_set(sort_item, '{column}', '"size_order"');
        size_sort_array := size_sort_array || sort_item;
      ELSE
        new_sort_array := new_sort_array || sort_item;
      END IF;
    END LOOP;

    sort_json := jsonb_set(sort_json, '{sort}', new_sort_array);

    IF jsonb_array_length(size_sort_array) > 0 THEN
      size_sort := jsonb_build_object('sort', size_sort_array);
    END IF;

    search_json := search_json - 'sort';
  END IF;

  IF search_json <> '{}' AND search_json -> 'search' IS NOT NULL THEN
    search_array := search_json -> 'search';
    RAISE NOTICE 'searched %', search_array;

    FOR i IN 0 .. jsonb_array_length(search_array) - 1 LOOP
      search_item := search_array -> i;
      IF search_item ->> 'column' = 'size' THEN
        size_search_array := size_search_array || search_item;
      ELSE
        new_search_array := new_search_array || search_item;
      END IF;
    END LOOP;

    search_json := jsonb_set(search_json, '{search}', new_search_array);
    RAISE NOTICE 'size search array %', size_search_array;

    IF jsonb_array_length(size_search_array) > 0 THEN
      size_search := jsonb_build_object('search', size_search_array);
    END IF;
  END IF;

  IF size_search IS NOT NULL AND size_search <> '{}' THEN
    RAISE NOTICE ' in size search %', size_search;
    v_size_search_cls := global.form_table_query(size_search);
  END IF;

  IF size_sort IS NOT NULL AND size_sort <> '{}' THEN
    RAISE NOTICE ' in size sort %', size_sort;
    v_size_sort_cls := global.form_table_query(size_sort);
  else
    v_size_sort_cls := 'ORDER BY size_order ASC NULLS LAST';
  END IF;

  IF search_json <> '{}' THEN
    v_search_cls := global.form_table_query(search_json);
  END IF;

  IF sort_json <> '{}' THEN
    v_sort_cls := global.form_table_query(sort_json);
  END IF;

  v_recommended_orders_sql := '
    WITH min_rop_helper AS (
      SELECT 
        oor.article, --choice
        oor.loc_code, --dc
        oor.size, --size
        oor.recom_receipt_date, --Target Inventory Breach Date
        oor.product_code,
        oor.rop,
        oor.order_status_id, 
        oor.created_at,
        oor.inventory_deficit_agg,
        oor.lost_sales_agg,
        oor.unit_cost,
        oor.ia_shipment_order_quantity,
        oor.roq_unconstrained,
        oor.order_quantity, --order Quantity
        oor.order_placement_date,
        oor.order_quantity * oor.unit_cost as order_cost,
        oor.raw_roq,
        oor.roq_constrained,
        oor.order_placement_recom_date, --order Placement Recommended date
        oor.expected_receipt_date,
        oor.order_type,
        oor.elt_projected_safety_stock,
        oor.elt_projected_bop,
        oor.lost_sales_agg * oor.unit_cost as lost_sales_agg_cost,
        ast."order" as size_order,
        MIN(oor.rop) OVER (PARTITION BY oor.article, oor.loc_code) AS min_rop --order placement date
      FROM 
        inventory_smart.oms_orders_recommended oor
      LEFT JOIN (
      SELECT 
        product_code, size, MIN("order") AS "order"
      FROM 
        inventory_smart.article_status_tag
      GROUP BY product_code, size
      ) ast
    ON ast.size = oor.size AND ast.product_code = oor.product_code
      WHERE 
        oor.order_status_id IN (0) AND oor.order_gen_type != ''Manual'' AND oor.raw_roq > 0 AND oor.order_type IN (''Order Cycle'', ''Reorder Point'') AND oor.order_placement_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL ''14 days''
    ),
    recommended_min_rop AS (
      SELECT * FROM min_rop_helper WHERE rop = min_rop
    ),
    sorted_data AS (
      SELECT * FROM recommended_min_rop
      ' || v_size_search_cls || '
      ' || v_size_sort_cls || '
    ),
    distinct_po_counts AS (
      SELECT 
        po.loc_code,
        po.product_code,
        SUM(po.oo) + SUM(po.it) AS commited_receipt_units, -- PO receipts
        COUNT(DISTINCT po.po_id) AS distinct_po_count
      FROM inventory_smart.oms_po_master po  
      GROUP BY po.loc_code, po.product_code  
    ),
    paf_kpi_oor AS (
      SELECT   
        paf.l1_name,
        paf.l0_name,
        paf.l2_name,
        paf.l3_name,
        paf.l4_name,
        paf.style_name,
        paf.vendor_desc,
        ok.store_inv,
        ok.dc_inv,
        ok.system_inv,
        ok.safety_stock,
        ok.open_receipt_units,
        oor.*
      FROM
        sorted_data oor
      INNER JOIN 
        global.product_attributes_filter paf
      ON oor.product_code = paf.product_code 
      LEFT JOIN
        inventory_smart.oms_kpi ok
      ON 
        paf.product_code = ok.product_code AND oor.loc_code = ok.loc_code 
      JOIN (SELECT * FROM global.distribution_centres WHERE is_active AND NOT is_deleted) dc 
      ON dc.linked_store_code = oor.loc_code
      ' || v_pa_sql || '
    ),
    shipment_mode_agg AS (
      SELECT
        article,
        loc_code,
        ARRAY_AGG(
          jsonb_build_object(
            ''shipment_mode'', mode_shipment,
            ''lead_time'', lead_time,
            ''default_mode'', default_mode
          )
        ) AS shipment_modes,
        MAX(
          CASE WHEN default_mode = 1 THEN lead_time END
        ) AS lead_time,
        MAX(
          CASE WHEN default_mode = 1 THEN mode_shipment END
        ) AS shipment_mode
      FROM inventory_smart.oms_constraints_lead_time
      GROUP BY article, loc_code
    )
    SELECT * FROM (
      SELECT
        alerts.article, -- 1
        alerts.loc_code, -- 2 
        MAX(COALESCE(alerts.is_recom_order_resolved, FALSE)::INT)::BOOLEAN AS is_resolved,
        SUM(COALESCE(pko.store_inv, 0)) AS store_inv, --6 Store Inventory
        SUM(COALESCE(pko.dc_inv, 0)) AS dc_inv, --7 --DC Inventory
        CONCAT(alerts.article, alerts.loc_code) AS unique_row_id,
        CONCAT(alerts.article, alerts.loc_code) AS id,
        MAX(alerts.historic_sales_unit) AS historic_sales_unit,
        MAX(alerts.historic_sales_value) AS historic_sales_value,
        SUM(COALESCE(pko.raw_roq, 0)) AS raw_roq,
        SUM(COALESCE(pko.roq_constrained, 0)) AS roq_constrained,
        MIN(pko.expected_receipt_date) AS earliest_receipt_date,
        SUM(COALESCE(pko.system_inv, 0)) AS total_inv, -- 9 Total Inventory
        MAX(pko.order_placement_recom_date) AS order_placement_recom_date, --10
        MAX(pko.order_placement_date) AS order_placement_date,
        SUM(COALESCE(po.commited_receipt_units, 0)) AS commited_receipt_units,
        SUM(COALESCE(pko.order_quantity, 0)) AS order_quantity,
        MAX(pko.recom_receipt_date) AS recom_receipt_date,
        MAX(sm.lead_time) AS lead_time,
        MAX(sm.shipment_modes) AS shipment_modes,
        MAX(sm.shipment_mode) AS shipment_mode,
        MAX(pko.vendor_desc) AS vendor_desc,
        MAX(pko.l0_name) as l0_name,
        MAX(pko.l1_name) as l1_name,
        MAX(pko.l2_name) as l2_name,
        MAX(pko.l3_name) as l3_name,
        MAX(pko.l4_name) as l4_name,
        MAX(pko.style_name) as style_name,
        SUM(COALESCE(pko.order_cost, 0)) AS order_cost,
        ARRAY_AGG(
          jsonb_build_object(
            ''size'', alerts.size, -- 3
            ''loc_code'', alerts.loc_code,
            ''article'', alerts.article,
            ''vendor_desc'', pko.vendor_desc,
            ''store_inv'', COALESCE(pko.store_inv, 0), --6
            ''dc_inv'', COALESCE(pko.dc_inv, 0), --7,
            ''total_inv'', COALESCE(pko.system_inv, 0), -- 9
            ''order_quantity'', COALESCE(pko.order_quantity, 0),
            ''raw_roq'', COALESCE(pko.raw_roq, 0),
            ''order_cost'', COALESCE(pko.order_cost, 0),
            ''commited_receipt_units'', COALESCE(po.commited_receipt_units, 0), -- 8
            ''order_placement_recom_date'', pko.order_placement_recom_date, --10
            ''order_placement_date'', pko.order_placement_date, --10
            ''recom_receipt_date'', pko.recom_receipt_date,
            ''l0_name'', pko.l0_name,
            ''l1_name'', pko.l1_name,
            ''l2_name'', pko.l2_name,
            ''l3_name'', pko.l3_name,
            ''l4_name'', pko.l4_name,
            ''style_name'', pko.style_name
          ) ' || v_size_sort_cls || '
        ) AS product_details
      FROM 
        inventory_smart.oms_alerts alerts
      INNER JOIN
        paf_kpi_oor pko
      ON 
        alerts.article = pko.article AND alerts.loc_code = pko.loc_code AND pko.product_code = alerts.product_code
      LEFT JOIN
        distinct_po_counts po
      ON alerts.product_code = po.product_code AND alerts.loc_code = po.loc_code
      LEFT JOIN
        shipment_mode_agg sm
      ON alerts.article = sm.article AND alerts.loc_code = sm.loc_code
      WHERE alerts.recom_order
      ' || CASE WHEN v_filter_reviewed_orders THEN ' and not alerts.is_recom_order_resolved = true' ELSE '' END || ' 
      GROUP BY alerts.article, alerts.loc_code
    ) X
    ' || v_search_cls || '
    ' || v_sort_cls || '
    ' || v_limit_cls;

  IF $3 IS FALSE THEN
    v_recommended_orders_sql := 'SELECT row_to_json(Y)::jsonb AS result FROM (' || v_recommended_orders_sql || ') Y ';
  ELSE 
    v_recommended_orders_sql := 'SELECT jsonb_build_object(''count'', count(*)) AS result FROM (' || v_recommended_orders_sql || ') Y ';
  END IF;

  RAISE NOTICE 'v_recommended_orders_sql %', v_recommended_orders_sql;
  RETURN QUERY EXECUTE v_recommended_orders_sql;
END
$function$;