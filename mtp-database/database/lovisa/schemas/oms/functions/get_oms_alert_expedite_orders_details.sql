--liquibase formatted sql
--changeset raja.duraisamy:get_oms_alert_expedite_orders_details_v5_optimized_8_MTP-131864 runOnChange:true stripComments:false splitStatements:false context:PERFORMANCE_OPTIMIZATION labels:get_oms_alert_expedite_orders_details_vs_21_optimized
--comment: PERFORMANCE OPTIMIZATION + linked_store_codes DC filter support
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_oms_alert_expedite_orders_details(input refcursor, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_alert_expedite_orders_details(input refcursor, jsonb, jsonb, filter_reviewed_orders boolean)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_pa_sql              TEXT := '';
    v_expedite_orders_sql TEXT := '';
  v_loc_filter           text := '';
  v_product_filter_for_pa jsonb;
  product_filter         jsonb := $2 || '{}';
      v_limit_cls           text := '';
  v_search_cls          text := '';
  v_sort_cls            text := '';
  limit_json            jsonb := '{}';
  search_json           jsonb := '{}';
  sort_json             jsonb := '{}';
  new_sort_array        jsonb := '[]'::jsonb;
  size_sort_array       jsonb := '[]'::jsonb;
  new_search_array      jsonb := '[]'::jsonb;
  sort_array            jsonb := '[]'::jsonb;
  size_search_array     jsonb := '[]'::jsonb;
  search_array          jsonb := '[]'::jsonb;
  sort_item             jsonb := '{}';
  search_item           jsonb := '{}';
  size_sort             jsonb := '{}';
  size_search           jsonb := '{}';
  v_size_search_cls     text := '';
  add_default_sort       boolean := true;
  v_filter_reviewed_orders boolean := false;

BEGIN
    IF jsonb_array_length(COALESCE((product_filter->'linked_store_codes')->0->'values', '[]'::jsonb)) > 0 THEN
      SELECT ' AND linked_store_code = ANY(ARRAY[' || string_agg(quote_literal(elem::text), ',') || ']::text[])'
        INTO v_loc_filter
        FROM jsonb_array_elements_text((product_filter->'linked_store_codes')->0->'values') AS elem;
    END IF;
    v_product_filter_for_pa := product_filter - 'linked_store_codes';

    -- Generate additional SQL filters
    v_pa_sql := inventory_smart.form_main_table_filters(
        'ph_master',
        v_product_filter_for_pa
    );

    search_json := $3;
    v_filter_reviewed_orders := $4;

    if $3 <> '{}' and $3 -> 'limit' is not null then
    -- Extract the 'limit' object
    limit_json := $3 -> 'limit';
    search_json := search_json - 'limit';
    v_limit_cls := global.form_table_query(jsonb_build_object('limit', limit_json));
  end if;

  -- Remove and process 'sort'
  if search_json <> '{}' and search_json -> 'sort' is not null then
    sort_array := search_json -> 'sort';
    raise notice 'sorted array %', sort_array;

    -- Iterate through sort array elements
    for i in 0 .. jsonb_array_length(sort_array) - 1 loop
      sort_item := sort_array -> i;
      if sort_item ->> 'column' = 'size' then
        sort_item := jsonb_set(sort_item, '{column}', '"size_order"');
        size_sort_array := size_sort_array || sort_item;
      else
        if sort_item ->> 'column' = 'recom_receipt_date' then
          add_default_sort := false;
        end if;
        new_sort_array := new_sort_array || sort_item;
      end if;
    end loop;

    -- Update sort_json with the new filtered sort array
    sort_json := jsonb_set(sort_json, '{sort}', new_sort_array);

    -- If any size sort conditions exist, create a separate JSON object
    if jsonb_array_length(size_sort_array) > 0 then
      size_sort := jsonb_build_object('sort', size_sort_array);
    end if;

    search_json := search_json - 'sort';
  end if;

  -- Process 'search' array
  if search_json <> '{}' and search_json -> 'search' is not null then
    search_array := search_json -> 'search';
    raise notice 'searched %', search_array;

    -- Iterate through search array elements
    for i in 0 .. jsonb_array_length(search_array) - 1 loop
      search_item := search_array -> i;
      if search_item ->> 'column' = 'size' then
        size_search_array := size_search_array || search_item;
      else
        new_search_array := new_search_array || search_item;
      end if;
    end loop;

    -- Update search_json with the new filtered search array
    search_json := jsonb_set(search_json, '{search}', new_search_array);
    raise notice 'size search array %', size_search_array;

    -- If any size search conditions exist, create a separate JSON object
    if jsonb_array_length(size_search_array) > 0 then
      size_search := jsonb_build_object('search', size_search_array);
    end if;
  end if;

  if size_search is not null and size_search <> '{}' then
    raise notice ' in size search %', size_search;
    v_size_search_cls := global.form_table_query(size_search);
  end if;

  if add_default_sort then
    new_sort_array := new_sort_array || jsonb_build_object('column', 'recom_receipt_date', 'order', 'asc');
    sort_json := jsonb_set(sort_json, '{sort}', new_sort_array);
  end if;

  if search_json <> '{}' then
    v_search_cls := global.form_table_query(search_json);
  end if;

  if sort_json <> '{}' then
    v_sort_cls := global.form_table_query(sort_json);
  end if;

    -- Construct the main SQL query (min_rop_immediate restricted to expedite alert (article,loc_code) - MTP-128296)
    v_expedite_orders_sql := '
   WITH paf AS (
    SELECT l4_name, style_name, vendor
    FROM global.product_attributes_filter
    ' || v_pa_sql || ' and ordering = ''Y'' and active
),
dc_filter AS (
    SELECT linked_store_code
    FROM global.distribution_centres
    WHERE is_active and not is_deleted
    ' || v_loc_filter || '
),
alerts_filtered AS (
    SELECT
        article,
        loc_code,
        product_code,
        size,
        lost_sales_aggregated_unit,
        lost_sales_aggregated_value,
        dc_wos_oh_oo_it,
        dc_store_wos_oh_oo_it,
        potential_sales_unit,
        potential_sales_value,
        historic_sales_unit,
        historic_sales_value,
        receipt_date_earliest,
        order_placement_date_earliest,
        raw_roq_earliest,
        date_diff,
        roq_unconstrained_earliest,
        is_expedite_order_resolved,
        style_name, 
        vendor,
        l4_name
    FROM inventory_smart.oms_alerts
    inner join paf on paf.l4_name = oms_alerts.product_code
    inner join dc_filter on dc_filter.linked_store_code = oms_alerts.loc_code
    WHERE expedite_order = TRUE
),
min_rop_immediate AS (
    SELECT
        oor.article,
        oor.loc_code,
        MIN(oor.rop) AS min_rop,
        MIN(oor.expected_receipt_date) AS earliest_receipt_date
    FROM inventory_smart.oms_orders_recommended oor
    inner join paf on paf.l4_name = oor.product_code
    inner join dc_filter on dc_filter.linked_store_code = oor.loc_code
    WHERE oor.order_type = ''Immediate''
      AND oor.order_gen_type != ''Manual''
      AND oor.order_status_id != 3
      AND EXISTS (
          SELECT 1
          FROM inventory_smart.oms_alerts af
          WHERE af.expedite_order = TRUE
            AND af.article = oor.article
            AND af.loc_code = oor.loc_code
      )
    GROUP BY oor.article, oor.loc_code
),
recommended_orders AS (
    SELECT
        oor.article,
        oor.loc_code,
        oor.product_code,
        oor.size,
        oor.rop,
        oor.order_quantity,
        oor.order_quantity * oor.unit_cost AS order_cost,
        oor.raw_roq,
        oor.roq_unconstrained,
        oor.roq_constrained,
        oor.ia_shipment_order_quantity,
        oor.order_placement_date,
        oor.order_placement_recom_date,
        oor.recom_receipt_date,
        oor.expected_receipt_date,
        oor.unit_cost,
        oor.elt_projected_safety_stock,
        oor.elt_projected_bop,
        GREATEST(oor.elt_projected_safety_stock - oor.elt_projected_bop, 0) AS safety_stock_deficit,
        mri.earliest_receipt_date,
        dc.name AS dc_name
    FROM inventory_smart.oms_orders_recommended oor
    inner join paf on paf.l4_name = oor.product_code
    inner join dc_filter on dc_filter.linked_store_code = oor.loc_code
    INNER JOIN global.distribution_centres dc
      ON dc.linked_store_code = oor.loc_code
     AND dc.is_active
     AND NOT dc.is_deleted
    JOIN min_rop_immediate mri
      ON mri.article = oor.article
     AND mri.loc_code = oor.loc_code
     AND mri.min_rop = oor.rop
),
alert_orders AS (
    SELECT ro.*
    FROM recommended_orders ro
    JOIN alerts_filtered af
      ON af.article = ro.article
     AND af.loc_code = ro.loc_code
     AND af.product_code = ro.product_code
),
alert_orders_kpi AS (
    SELECT
        ao.*,
        ok.store_inv,
        ok.dc_inv,
        ok.system_inv,
        ok.safety_stock,
        ok.open_receipt_units
    FROM alert_orders ao
    LEFT JOIN inventory_smart.oms_kpi ok
      ON ok.product_code = ao.product_code
     AND ok.loc_code = ao.loc_code
),
po_aggregated AS (
    SELECT
        po.loc_code,
        po.product_code,
        SUM(po.oo + po.it) AS commited_receipt_units,
        COUNT(DISTINCT po.po_id) AS distinct_po_count
    FROM inventory_smart.oms_po_master po
    WHERE EXISTS (
        SELECT 1
        FROM alert_orders ao
        WHERE ao.loc_code = po.loc_code
          AND ao.product_code = po.product_code
    )
    GROUP BY po.loc_code, po.product_code
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
        MAX(CASE WHEN default_mode = 1 THEN lead_time END) AS lead_time,
        MAX(CASE WHEN default_mode = 1 THEN mode_shipment END) AS shipment_mode
    FROM inventory_smart.oms_constraints_lead_time
    GROUP BY article, loc_code
)
SELECT *
FROM (
    SELECT
        af.article,
        af.loc_code,
        MAX(COALESCE(af.is_expedite_order_resolved, FALSE)::INT)::BOOLEAN AS is_resolved,
        SUM(COALESCE(alert_orders_kpi.store_inv,0)) AS store_inv,
        SUM(COALESCE(alert_orders_kpi.dc_inv,0)) AS dc_inv,
        SUM(COALESCE(alert_orders_kpi.system_inv,0)) AS total_inv,
        SUM(COALESCE(po.commited_receipt_units,0)) AS commited_receipt_units,
        SUM(COALESCE(po.distinct_po_count,0)) AS distinct_po_count,
        MAX(alert_orders_kpi.order_placement_recom_date) AS order_placement_recom_date,
        MIN(alert_orders_kpi.expected_receipt_date) AS expected_receipt_date,
        MAX(sm.shipment_mode) AS shipment_mode,
        MAX(sm.lead_time) AS lead_time,
        MAX(sm.shipment_modes) AS shipment_modes,
        MAX(af.l4_name) AS l4_name,
        MAX(af.style_name) AS style_name,
        MAX(af.vendor) AS vendor,
        MAX(alert_orders_kpi.dc_name) AS dc_name,
        SUM(COALESCE(alert_orders_kpi.order_quantity,0)) AS order_quantity,
        SUM(COALESCE(alert_orders_kpi.order_cost,0)) AS order_cost,
        SUM(COALESCE(alert_orders_kpi.raw_roq,0)) AS raw_roq,
        SUM(COALESCE(alert_orders_kpi.ia_shipment_order_quantity,0)) AS ia_shipment_order_quantity,
        SUM(COALESCE(alert_orders_kpi.roq_unconstrained,0)) AS roq_unconstrained,
        SUM(COALESCE(alert_orders_kpi.roq_constrained,0)) AS roq_constrained,
        MAX(alert_orders_kpi.recom_receipt_date) AS recom_receipt_date,
        SUM(COALESCE(alert_orders_kpi.safety_stock_deficit,0)) AS safety_stock_deficit,
        SUM(COALESCE(af.lost_sales_aggregated_unit,0)) AS lost_sales_agg,
        SUM(COALESCE(af.lost_sales_aggregated_value,0)) AS lost_sales_agg_cost,
        AVG(COALESCE(af.dc_wos_oh_oo_it,0)) AS dc_wos_oh_oo_it,
        AVG(COALESCE(af.dc_store_wos_oh_oo_it,0)) AS dc_store_wos_oh_oo_it,
        SUM(COALESCE(af.potential_sales_unit,0)) AS potential_sales_unit,
        SUM(COALESCE(af.potential_sales_value,0)) AS potential_sales_value,
        SUM(COALESCE(af.historic_sales_unit,0)) AS historic_sales_unit,
        SUM(COALESCE(af.historic_sales_value,0)) AS historic_sales_value,
        MAX(af.receipt_date_earliest) AS receipt_date_earliest,
        MAX(af.order_placement_date_earliest) AS order_placement_date_earliest,
        SUM(COALESCE(af.raw_roq_earliest,0)) AS raw_roq_earliest,
        AVG(COALESCE(af.date_diff,0)) AS date_diff,
        SUM(COALESCE(alert_orders_kpi.roq_unconstrained,0)) AS roq_unconstrained_earliest,
        MAX(alert_orders_kpi.order_placement_date) AS order_placement_date,
        concat(af.article, af.loc_code) as unique_row_id,
        concat(af.article, af.loc_code) as id,
        ARRAY_AGG(
            jsonb_build_object(
                ''size'', af.size,
                ''historic_sales_unit'', af.historic_sales_unit,
                ''historic_sales_value'', af.historic_sales_value,
                ''loc_code'', af.loc_code,
                ''dc_name'', alert_orders_kpi.dc_name,
                ''article'', af.article,
                ''store_inv'', alert_orders_kpi.store_inv,
                ''dc_inv'', alert_orders_kpi.dc_inv,
                ''total_inv'', alert_orders_kpi.system_inv,
                ''safety_stock_deficit'', alert_orders_kpi.safety_stock_deficit,
                ''order_quantity'', alert_orders_kpi.order_quantity,
                ''order_cost'', alert_orders_kpi.order_cost,
                ''raw_roq'', alert_orders_kpi.raw_roq,
                ''ia_shipment_order_quantity'', alert_orders_kpi.ia_shipment_order_quantity,
                ''roq_unconstrained'', alert_orders_kpi.roq_unconstrained,
                ''roq_constrained'', alert_orders_kpi.roq_constrained,
                ''recom_receipt_date'', alert_orders_kpi.recom_receipt_date,
                ''commited_receipt_units'', COALESCE(po.commited_receipt_units,0),
                ''order_placement_recom_date'', alert_orders_kpi.order_placement_recom_date,
                ''expected_receipt_date'', alert_orders_kpi.expected_receipt_date,
                ''distinct_po_count'', COALESCE(po.distinct_po_count,0),
                ''lost_sales_agg'', af.lost_sales_aggregated_unit,
                ''lost_sales_agg_cost'', af.lost_sales_aggregated_value,
                ''potential_sales_unit'', af.potential_sales_unit,
                ''potential_sales_value'', af.potential_sales_value,
                ''order_placement_date'', alert_orders_kpi.order_placement_date,
                ''receipt_date_earliest'', af.receipt_date_earliest,
                ''order_placement_date_earliest'', af.order_placement_date_earliest,
                ''raw_roq_earliest'', af.raw_roq_earliest,
                ''date_diff'', af.date_diff,
                ''l4_name'', af.l4_name,
                ''style_name'', af.style_name
            )
        ) AS product_details
    FROM alerts_filtered af
    JOIN alert_orders_kpi alert_orders_kpi
      ON af.article = alert_orders_kpi.article
     AND af.loc_code = alert_orders_kpi.loc_code
     AND af.product_code = alert_orders_kpi.product_code
    LEFT JOIN po_aggregated po
      ON po.loc_code = alert_orders_kpi.loc_code
     AND po.product_code = alert_orders_kpi.product_code
    LEFT JOIN shipment_mode_agg sm
      ON sm.article = alert_orders_kpi.article
     AND sm.loc_code = alert_orders_kpi.loc_code
    WHERE 1=1
      ' || CASE WHEN v_filter_reviewed_orders THEN 'AND NOT af.is_expedite_order_resolved = TRUE' ELSE '' END || '
    GROUP BY af.article, af.loc_code
) X
' || v_search_cls || '
' || v_sort_cls || '
' || v_limit_cls;

    -- Debugging SQL
    RAISE NOTICE 'v_expedite_orders_sql: %', v_expedite_orders_sql;

    -- Open the cursor and execute the query
    OPEN $1 FOR EXECUTE v_expedite_orders_sql;
    RETURN $1;
END;
$function$;
