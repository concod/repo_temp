--liquibase formatted sql
--changeset raja.duraisamy:get_oms_alert_need_before_next_roq_details_vs_20_optimized_2_MTP-131864 runOnChange:true stripComments:false splitStatements:false context:PERFORMANCE_OPTIMIZATION labels:get_oms_alert_need_before_next_roq_details_vs_20_optimized
--comment: PERFORMANCE OPTIMIZATION + linked_store_codes DC filter support
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_oms_alert_need_before_next_roq_details(input refcursor, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_alert_need_before_next_roq_details(input refcursor, jsonb, jsonb, filter_reviewed_orders boolean)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
  v_pa_sql                    text:='';
  v_need_before_next_roq_sql  text:='';
  v_loc_filter                text:='';
  v_product_filter_for_pa     jsonb;
  product_filter              jsonb := $2 || '{}';
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
  v_size_sort_cls       text := '';
  add_default_sort       boolean := true;
  v_filter_reviewed_orders boolean := false;

begin
  IF jsonb_array_length(COALESCE((product_filter->'linked_store_codes')->0->'values', '[]'::jsonb)) > 0 THEN
    SELECT ' AND linked_store_code = ANY(ARRAY[' || string_agg(quote_literal(elem::text), ',') || ']::text[])'
      INTO v_loc_filter
      FROM jsonb_array_elements_text((product_filter->'linked_store_codes')->0->'values') AS elem;
  END IF;
  v_product_filter_for_pa := product_filter - 'linked_store_codes';

  v_pa_sql :=inventory_smart.form_main_table_filters(
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

  -- will sort by size_order by default if no size sort is provided
  if size_sort is not null and size_sort <> '{}' then
    raise notice ' in size sort %', size_sort;
    v_size_sort_cls := global.form_table_query(size_sort);
  else
    v_size_sort_cls := 'ORDER BY size_order ASC NULLS LAST';
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

   v_need_before_next_roq_sql := '
     WITH paf AS (
    SELECT DISTINCT ON (l4_name)
           l4_name,
           style_name,
           vendor
    FROM global.product_attributes_filter
    ' || v_pa_sql || ' and ordering = ''Y'' and active
),
dc_filter AS (
    SELECT linked_store_code
    FROM global.distribution_centres
    WHERE is_active and not is_deleted
    ' || v_loc_filter || '
),
oor_base AS (
    SELECT
        oor.article,
        oor.loc_code,
        oor.size,
        oor.product_code,
        oor.rop,
        oor.order_type,
        oor.expected_receipt_date,
        oor.order_quantity,
        oor.unit_cost,
        oor.raw_roq,
        oor.roq_unconstrained,
        oor.roq_constrained,
        oor.ia_shipment_order_quantity,
        oor.recom_receipt_date,
        oor.order_placement_date,
        oor.order_placement_recom_date,
        oor.elt_projected_safety_stock,
        oor.elt_projected_bop,
        oor.lost_sales_agg,
        dc.name AS dc_name
    FROM inventory_smart.oms_orders_recommended oor
    JOIN paf
      ON paf.l4_name = oor.product_code
    INNER JOIN dc_filter dcf
      ON dcf.linked_store_code = oor.loc_code
    INNER JOIN global.distribution_centres dc
      ON dc.linked_store_code = oor.loc_code
     AND dc.is_active
     AND NOT dc.is_deleted
    WHERE
        oor.order_gen_type <> ''Manual''
        AND oor.order_status_id <> 3
),

min_immediate_rop AS (
    SELECT
        article,
        loc_code,
        MIN(rop) AS min_rop,
        MIN(expected_receipt_date) AS earliest_receipt_date
    FROM oor_base
    WHERE order_type = ''Immediate''
    GROUP BY article, loc_code
),

recommended_orders AS (
    SELECT
        oor.*,
        mir.earliest_receipt_date,
        GREATEST(
            oor.elt_projected_safety_stock - oor.elt_projected_bop,
            0
        ) AS safety_stock_deficit,
        oor.order_quantity * oor.unit_cost AS order_cost,
        oor.lost_sales_agg * oor.unit_cost AS lost_sales_agg_cost
    FROM oor_base oor
    JOIN min_immediate_rop mir
      ON mir.article = oor.article
     AND mir.loc_code = oor.loc_code
     AND oor.rop = mir.min_rop
),

size_order AS (
    SELECT product_code, size, MIN("order") AS size_order
    FROM inventory_smart.article_status_tag
    WHERE product_code IN (SELECT l4_name FROM paf)
    GROUP BY product_code, size
),

recommended_enriched AS (
    SELECT
        ro.*,
        so.size_order
    FROM recommended_orders ro
    LEFT JOIN size_order so
      ON so.product_code = ro.product_code
     AND so.size = ro.size
    ' || v_size_search_cls || '
),

kpi AS (
    SELECT product_code, loc_code, store_inv, dc_inv, system_inv
    FROM inventory_smart.oms_kpi
),

po_agg AS (
    SELECT
        loc_code,
        product_code,
        SUM(oo + it) AS commited_receipt_units,
        COUNT(DISTINCT po_id) AS distinct_po_count
    FROM inventory_smart.oms_po_master
    WHERE product_code IN (SELECT l4_name FROM paf)
    GROUP BY loc_code, product_code
),

shipment_mode AS (
    SELECT
        article,
        loc_code,
        MAX(CASE WHEN default_mode = 1 THEN lead_time END) AS lead_time,
        MAX(CASE WHEN default_mode = 1 THEN mode_shipment END) AS shipment_mode,
        ARRAY_AGG(
            jsonb_build_object(
                ''shipment_mode'', mode_shipment,
                ''lead_time'', lead_time,
                ''default_mode'', default_mode
            )
        ) AS shipment_modes
    FROM inventory_smart.oms_constraints_lead_time sm
    WHERE EXISTS (
        SELECT 1 FROM oor_base ob
        WHERE ob.article = sm.article AND ob.loc_code = sm.loc_code
    )
    GROUP BY article, loc_code
)

SELECT *
FROM (
    SELECT
        a.article,
        a.loc_code,

        MAX(COALESCE(a.is_need_before_next_roq_resolved, FALSE)::int)::boolean AS is_resolved,

        SUM(COALESCE(k.store_inv, 0)) AS store_inv,
        SUM(COALESCE(k.dc_inv, 0)) AS dc_inv,

        CONCAT(a.article, a.loc_code) AS unique_row_id,
        CONCAT(a.article, a.loc_code) AS id,

        SUM(COALESCE(a.historic_sales_unit, 0)) AS historic_sales_unit,
        SUM(COALESCE(a.historic_sales_value, 0)) AS historic_sales_value,

        SUM(COALESCE(po.commited_receipt_units, 0)) AS commited_receipt_units,
        SUM(COALESCE(k.system_inv, 0)) AS total_inv,

        MAX(ro.order_placement_recom_date) AS order_placement_recom_date,
        MAX(ro.expected_receipt_date) AS expected_receipt_date,

        SUM(COALESCE(a.lost_sales_aggregated_unit, 0)) AS lost_sales_agg,
        SUM(COALESCE(a.lost_sales_aggregated_value, 0)) AS lost_sales_agg_cost,

        AVG(a.dc_wos_oh_oo_it) AS dc_wos_oh_oo_it,
        AVG(a.dc_store_wos_oh_oo_it) AS dc_store_wos_oh_oo_it,

        SUM(COALESCE(a.potential_sales_unit, 0)) AS potential_sales_unit,
        SUM(COALESCE(a.potential_sales_value, 0)) AS potential_sales_value,

        MAX(a.receipt_date_earliest) AS receipt_date_earliest,
        MAX(a.order_placement_date_earliest) AS order_placement_date_earliest,
        SUM(COALESCE(a.raw_roq_earliest, 0)) AS raw_roq_earliest,
        AVG(COALESCE(a.date_diff, 0)) AS date_diff,

        SUM(COALESCE(ro.order_quantity, 0)) AS order_quantity,
        SUM(COALESCE(ro.order_cost, 0)) AS order_cost,
        SUM(COALESCE(ro.raw_roq, 0)) AS raw_roq,
        SUM(COALESCE(ro.ia_shipment_order_quantity, 0)) AS ia_shipment_order_quantity,
        SUM(COALESCE(ro.roq_unconstrained, 0)) AS roq_unconstrained,
        SUM(COALESCE(ro.roq_constrained, 0)) AS roq_constrained,

        MAX(ro.recom_receipt_date) AS recom_receipt_date,
        SUM(COALESCE(ro.safety_stock_deficit, 0)) AS safety_stock_deficit,

        MAX(sm.shipment_mode) AS shipment_mode,
        MAX(sm.lead_time) AS lead_time,
        MAX(sm.shipment_modes) AS shipment_modes,

        MAX(paf.l4_name) AS l4_name,
        MAX(paf.style_name) AS style_name,
        MAX(paf.vendor) AS vendor,
        MAX(ro.dc_name) AS dc_name,

        SUM(COALESCE(a.roq_unconstrained_earliest, 0)) AS roq_unconstrained_earliest,
        SUM(COALESCE(po.distinct_po_count, 0)) AS distinct_po_count,

        MAX(ro.order_placement_date) AS order_placement_date,

        ARRAY_AGG(
            jsonb_build_object(
                ''size'', ro.size,
                ''loc_code'', a.loc_code,
                ''dc_name'', ro.dc_name,
                ''article'', a.article,
                ''store_inv'', k.store_inv,
                ''dc_inv'', k.dc_inv,
                ''total_inv'', k.system_inv,
                ''safety_stock_deficit'', ro.safety_stock_deficit,
                ''order_quantity'', ro.order_quantity,
                ''order_cost'', ro.order_cost,
                ''raw_roq'', ro.raw_roq,
                ''ia_shipment_order_quantity'', ro.ia_shipment_order_quantity,
                ''roq_unconstrained'', ro.roq_unconstrained,
                ''roq_constrained'', ro.roq_constrained,
                ''recom_receipt_date'', ro.recom_receipt_date,
                ''commited_receipt_units'', COALESCE(po.commited_receipt_units, 0),
                ''order_placement_recom_date'', ro.order_placement_recom_date,
                ''expected_receipt_date'', ro.expected_receipt_date,
                ''lost_sales_agg'', a.lost_sales_aggregated_unit,
                ''lost_sales_agg_cost'', a.lost_sales_aggregated_value,
                ''potential_sales_unit'', a.potential_sales_unit,
                ''potential_sales_value'', a.potential_sales_value,
                ''receipt_date_earliest'', a.receipt_date_earliest,
                ''order_placement_date_earliest'', a.order_placement_date_earliest,
                ''raw_roq_earliest'', a.raw_roq_earliest,
                ''date_diff'', a.date_diff,
                ''l4_name'', paf.l4_name,
                ''style_name'', paf.style_name
            )
            ' || v_size_sort_cls || '
        ) AS product_details

    FROM inventory_smart.oms_alerts a
    INNER JOIN dc_filter dcf
      ON dcf.linked_store_code = a.loc_code
    JOIN recommended_enriched ro
      ON ro.article = a.article
     AND ro.loc_code = a.loc_code
     AND ro.product_code = a.product_code
    JOIN paf
      ON paf.l4_name = a.product_code
    LEFT JOIN kpi k
      ON k.product_code = a.product_code
     AND k.loc_code = a.loc_code
    LEFT JOIN po_agg po
      ON po.product_code = a.product_code
     AND po.loc_code = a.loc_code
    LEFT JOIN shipment_mode sm
      ON sm.article = a.article
     AND sm.loc_code = a.loc_code
    WHERE
        a.need_before_next_roq
        ' || CASE
            WHEN v_filter_reviewed_orders
            THEN ' AND NOT a.is_need_before_next_roq_resolved'
            ELSE ''
        END || '
    GROUP BY a.article, a.loc_code
) X
' || v_search_cls || '
' || v_sort_cls || '
' || v_limit_cls;
    
    raise notice 'v_need_before_next_roq_sql %',v_need_before_next_roq_sql;
    open $1 for execute v_need_before_next_roq_sql;
    RETURN $1;
  end
  $function$
;