--liquibase formatted sql
--changeset aman.pareek@impactanalytics.co:get_oms_alert_recommended_orders_details_lovisa_7 runOnChange:true stripComments:false splitStatements:false context:MTP-131834 labels:get_oms_alert_recommended_orders_details_lovisa_3
--comment: Added linked_store_codes DC filter support for detail view
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_oms_alert_recommended_orders_details(input refcursor, jsonb, jsonb);
DROP FUNCTION IF EXISTS inventory_smart.get_oms_alert_recommended_orders_details(jsonb, jsonb, boolean);

CREATE OR REPLACE FUNCTION inventory_smart.get_oms_alert_recommended_orders_details(jsonb, jsonb, boolean, filter_reviewed_orders boolean)
RETURNS TABLE(result jsonb)
LANGUAGE plpgsql
AS $function$
DECLARE
  v_pa_sql              TEXT := '';
  v_recommended_orders_sql  TEXT := '';
  v_loc_filter          TEXT := '';
  v_product_filter_for_pa JSONB;
  product_filter        JSONB := $1 || '{}';
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
  IF jsonb_array_length(COALESCE((product_filter->'linked_store_codes')->0->'values', '[]'::jsonb)) > 0 THEN
    SELECT ' AND linked_store_code = ANY(ARRAY[' || string_agg(quote_literal(elem::text), ',') || ']::text[])'
      INTO v_loc_filter
      FROM jsonb_array_elements_text((product_filter->'linked_store_codes')->0->'values') AS elem;
  END IF;
  v_product_filter_for_pa := product_filter - 'linked_store_codes';

  v_pa_sql := inventory_smart.form_main_table_filters('ph_master', v_product_filter_for_pa);
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
      -- Apply product_attributes_filter conditions FIRST to get only relevant product_codes
	  drop table if exists filtered_paf ;
	  CREATE TEMP TABLE filtered_paf as 
      SELECT DISTINCT
        paf.l4_name AS product_code,
        paf.style_name,
        paf.vendor
      FROM global.product_attributes_filter paf
      ' || v_pa_sql || ' and ordering = ''Y'' and active;

      drop table if exists filtered_dc ;
      CREATE TEMP TABLE filtered_dc as
      SELECT linked_store_code
      FROM global.distribution_centres
      WHERE is_active and not is_deleted
      ' || v_loc_filter || ';

      -- Filter orders and calculate min_rop in one pass using window function
      -- Uses partial index idx_oor_alert_order_cycle_consolidated for better performance
	  drop table if exists filtered_orders_with_min_rop ;
	  CREATE TEMP TABLE filtered_orders_with_min_rop as 
      SELECT 
        oor.article,
        oor.loc_code,
        oor.size,
        oor.recom_receipt_date,
        oor.product_code,
        oor.rop,
        oor.order_status_id, 
        oor.created_at,
        oor.inventory_deficit_agg,
        oor.lost_sales_agg,
        oor.unit_cost,
        oor.ia_shipment_order_quantity,
        oor.roq_unconstrained,
        oor.order_quantity,
        oor.order_placement_date,
        oor.order_quantity * oor.unit_cost as order_cost,
        oor.raw_roq,
        oor.roq_constrained,
        oor.order_placement_recom_date,
        oor.expected_receipt_date,
        oor.order_type,
        oor.elt_projected_safety_stock,
        oor.elt_projected_bop,
        oor.lost_sales_agg * oor.unit_cost as lost_sales_agg_cost,
        MIN(oor.rop) OVER (PARTITION BY oor.article, oor.loc_code) AS min_rop,
        dc.name AS dc_name
      FROM 
        inventory_smart.oms_orders_recommended oor
      INNER JOIN filtered_paf fp
        ON oor.product_code = fp.product_code
      INNER JOIN filtered_dc fdc
        ON fdc.linked_store_code = oor.loc_code
      INNER JOIN global.distribution_centres dc 
        ON dc.linked_store_code = oor.loc_code 
        AND dc.is_active AND NOT dc.is_deleted
      WHERE 
        oor.order_placement_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL ''14 days'';

      -- Keep only rows with min_rop and add size_order
	  drop table if exists recommended_min_rop ;
	  CREATE TEMP TABLE recommended_min_rop as 
      SELECT 
        fo.*,
        (SELECT MIN(ast."order") 
         FROM inventory_smart.article_status_tag ast
         WHERE ast.product_code = fo.product_code 
           AND ast.size = fo.size
         LIMIT 1) as size_order
      FROM filtered_orders_with_min_rop fo
      WHERE fo.rop = fo.min_rop ;

	drop table if exists sorted_data ;
	  CREATE TEMP TABLE sorted_data as 
      SELECT * FROM recommended_min_rop
      ' || v_size_search_cls || '
      ' || v_size_sort_cls || ' ;

      -- Get all keys needed for joins in one CTE
	  drop table if exists relevant_keys ;
	  CREATE TEMP TABLE relevant_keys as 
      SELECT DISTINCT
        article,
        loc_code,
        product_code
      FROM sorted_data ;

      -- Filter alerts early using EXISTS
	   drop table if exists filtered_alerts ;
	  CREATE TEMP TABLE filtered_alerts as 
      SELECT 
        alerts.article,
        alerts.loc_code,
        alerts.size,
        alerts.product_code,
        alerts.is_recom_order_resolved,
        alerts.historic_sales_unit,
        alerts.historic_sales_value
      FROM inventory_smart.oms_alerts alerts
      INNER JOIN filtered_dc fdc
        ON fdc.linked_store_code = alerts.loc_code
      WHERE alerts.recom_order' || 
      CASE WHEN v_filter_reviewed_orders THEN ' AND NOT alerts.is_recom_order_resolved = true' ELSE '' END || '
        AND EXISTS (
          SELECT 1 FROM relevant_keys rk
          WHERE rk.article = alerts.article 
            AND rk.loc_code = alerts.loc_code 
            AND rk.product_code = alerts.product_code
        );

      -- Aggregate PO data using EXISTS
	  drop table if exists distinct_po_counts ;
	  CREATE TEMP TABLE distinct_po_counts as 
      SELECT 
        po.loc_code,
        po.product_code,
        SUM(po.oo) + SUM(po.it) AS commited_receipt_units
      FROM inventory_smart.oms_po_master po
      WHERE EXISTS (
        SELECT 1 FROM relevant_keys rk
        WHERE rk.product_code = po.product_code 
          AND rk.loc_code = po.loc_code
      )
      GROUP BY po.loc_code, po.product_code ;

      -- Aggregate shipment modes using EXISTS
	  drop table if exists shipment_mode_agg ;
	  CREATE TEMP TABLE shipment_mode_agg as 
      SELECT
        sm.article,
        sm.loc_code,
        ARRAY_AGG(
          jsonb_build_object(
            ''shipment_mode'', sm.mode_shipment,
            ''lead_time'', sm.lead_time,
            ''default_mode'', sm.default_mode
          )
        ) AS shipment_modes,
        MAX(CASE WHEN sm.default_mode = 1 THEN sm.lead_time END) AS lead_time,
        MAX(CASE WHEN sm.default_mode = 1 THEN sm.mode_shipment END) AS shipment_mode
      FROM inventory_smart.oms_constraints_lead_time sm
      WHERE EXISTS (
        SELECT 1 FROM relevant_keys rk
        WHERE rk.article = sm.article 
          AND rk.loc_code = sm.loc_code
      )
      GROUP BY sm.article, sm.loc_code ;

      -- Join sorted_data with filtered_paf and oms_kpi (no DISTINCT ON needed since filtered_paf is DISTINCT)
	  drop table if exists paf_kpi_oor ;
	  CREATE TEMP TABLE paf_kpi_oor as 
      SELECT 
        fp.style_name,
        fp.product_code AS l4_name,
        fp.vendor,
        ok.store_inv,
        ok.dc_inv,
        ok.system_inv,
        ok.safety_stock,
        ok.open_receipt_units,
        oor.*
      FROM sorted_data oor
      INNER JOIN filtered_paf fp
        ON oor.product_code = fp.product_code
      LEFT JOIN inventory_smart.oms_kpi ok
        ON fp.product_code = ok.product_code 
        AND oor.loc_code = ok.loc_code;

	drop table if exists final_result ;
	CREATE TEMP TABLE final_result as 
    SELECT * FROM (
      SELECT
        alerts.article,
        alerts.loc_code, 
        MAX(COALESCE(alerts.is_recom_order_resolved, FALSE)::INT)::BOOLEAN AS is_resolved,
        SUM(COALESCE(pko.store_inv, 0)) AS store_inv,
        SUM(COALESCE(pko.dc_inv, 0)) AS dc_inv,
        CONCAT(alerts.article, alerts.loc_code) AS unique_row_id,
        CONCAT(alerts.article, alerts.loc_code) AS id,
        SUM(COALESCE(pko.system_inv, 0)) AS total_inv,
        MAX(pko.order_placement_recom_date) AS order_placement_recom_date,
        MAX(pko.expected_receipt_date) AS expected_receipt_date,
        SUM(COALESCE(po.commited_receipt_units, 0)) AS commited_receipt_units,
        SUM(COALESCE(pko.order_quantity, 0)) AS order_quantity,
        MAX(pko.recom_receipt_date) AS recom_receipt_date,
        MAX(sm.lead_time) AS lead_time,
        MAX(sm.shipment_modes) AS shipment_modes,
        MAX(sm.shipment_mode) AS shipment_mode,
        MAX(pko.style_name) as style_name,
        MAX(pko.l4_name) as l4_name,
        MAX(pko.vendor) as vendor,
        MAX(pko.dc_name) as dc_name,
        (TRUNC(SUM(COALESCE(pko.order_cost, 0))))::INT AS order_cost,
        SUM(COALESCE(pko.raw_roq, 0)) AS raw_roq,
        SUM(COALESCE(pko.roq_constrained, 0)) AS roq_constrained,
        SUM(COALESCE(alerts.historic_sales_unit, 0)) AS historic_sales_unit,
        (TRUNC(SUM(COALESCE(alerts.historic_sales_value, 0))))::INT AS historic_sales_value,
        MAX(pko.order_placement_date) as order_placement_date,
        ARRAY_AGG(
          jsonb_build_object(
            ''size'', alerts.size,
            ''loc_code'', alerts.loc_code,
            ''dc_name'', pko.dc_name,
            ''article'', alerts.article,
            ''store_inv'', COALESCE(pko.store_inv, 0),
            ''dc_inv'', COALESCE(pko.dc_inv, 0),
            ''total_inv'', COALESCE(pko.system_inv, 0),
            ''order_quantity'', COALESCE(pko.order_quantity, 0),
            ''commited_receipt_units'', COALESCE(po.commited_receipt_units, 0),
            ''order_placement_recom_date'', pko.order_placement_recom_date,
            ''expected_receipt_date'', pko.expected_receipt_date,
            ''recom_receipt_date'', pko.recom_receipt_date,
            ''style_name'', pko.style_name,
            ''l4_name'', pko.l4_name
          ) ' || v_size_sort_cls || '
        ) AS product_details
      FROM 
        filtered_alerts alerts
      INNER JOIN paf_kpi_oor pko
        ON alerts.article = pko.article 
        AND alerts.loc_code = pko.loc_code 
        AND pko.product_code = alerts.product_code
      LEFT JOIN distinct_po_counts po
        ON alerts.product_code = po.product_code 
        AND alerts.loc_code = po.loc_code
      LEFT JOIN shipment_mode_agg sm
        ON alerts.article = sm.article 
        AND alerts.loc_code = sm.loc_code
      GROUP BY alerts.article, alerts.loc_code
    ) X
    ' || v_search_cls || '
    ' || v_sort_cls || '
    ' || v_limit_cls;

  EXECUTE v_recommended_orders_sql;

  IF $3 IS FALSE THEN
    v_recommended_orders_sql := 'SELECT row_to_json(Z)::jsonb AS result FROM (SELECT Y.*, COUNT(*) OVER() AS total_count FROM final_result Y ) Z ';
  ELSE 
    v_recommended_orders_sql := 'SELECT jsonb_build_object(''count'', count(*)) AS result FROM  final_result Y ';
  END IF;

  RAISE NOTICE 'v_recommended_orders_sql %', v_recommended_orders_sql;
  RETURN QUERY EXECUTE v_recommended_orders_sql;
END
$function$;