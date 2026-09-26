--liquibase formatted sql
--changeset aman.pareek:get_oms_alert_expedite_orders_details_briscoes_6 runOnChange:true stripComments:false splitStatements:false context:MTP-119609 labels:get_oms_alert_expedite_orders_details_vs_12
--comment: bool param added 1
--rollback: SELECT 1
DROP FUNCTION IF EXISTS oms.get_oms_alert_expedite_orders_details(input refcursor, jsonb, jsonb);
DROP FUNCTION IF EXISTS oms.get_oms_alert_expedite_orders_details(input refcursor, jsonb, jsonb, filter_reviewed_orders boolean);
CREATE OR REPLACE FUNCTION oms.get_oms_alert_expedite_orders_details(input refcursor, jsonb, jsonb, filter_reviewed_orders boolean)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_pa_sql              TEXT := '';
    v_expedite_orders_sql TEXT := '';
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
  v_filter_reviewed_orders boolean := false;
BEGIN
    -- Generate additional SQL filters
    v_pa_sql := oms.form_main_table_filters(
        'ph_master',
        $2
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

  if size_sort is not null and size_sort <> '{}' then
    raise notice ' in size sort %', size_sort;
    v_size_sort_cls := global.form_table_query(size_sort);
  else
    v_size_sort_cls := 'ORDER BY size_order ASC NULLS LAST';
  end if;

  if search_json <> '{}' then
    v_search_cls := global.form_table_query(search_json);
  end if;

  if sort_json <> '{}' then
    v_sort_cls := global.form_table_query(sort_json);
  end if;

    -- Construct the main SQL query
    v_expedite_orders_sql := '
        WITH min_rop_base AS materialized (
            SELECT
                article,
                loc_code,
                MIN(rop) AS min_rop,
                MIN(expected_receipt_date)
                    FILTER (WHERE order_type = ''Immediate'')
                    AS earliest_receipt_date,
                MIN(expected_receipt_date)
                    FILTER (WHERE order_type = ''Order Cycle'')
                    AS order_cycle_receipt_date
            FROM oms.oms_orders_recommended
            WHERE order_gen_type != ''Manual''
              AND order_status_id != 3
              AND order_type = ''Immediate''
            GROUP BY article, loc_code
        )

        ,min_rop_helper AS materialized (
            SELECT 
            oor.article,
            oor.loc_code,
            oor.size,
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
			oor.order_quantity_eaches,
			oor.pack_id,
            oor.order_placement_date,
			oor.order_quantity * oor.unit_cost as order_cost,
            oor.raw_roq,
            oor.roq_constrained,
            oor.order_placement_recom_date,
            oor.recom_receipt_date,
            oor.expected_receipt_date,
            oor.order_type,
            oor.elt_projected_safety_stock,
            oor.elt_projected_bop,
            GREATEST(oor.elt_projected_safety_stock - oor.elt_projected_bop, 0) as safety_stock_deficit,
            oor.lost_sales_agg * oor.unit_cost as lost_sales_agg_cost,
            ast."order" as size_order,
            mr.min_rop,
            mr.earliest_receipt_date,
            mr.order_cycle_receipt_date
        FROM 
            oms.oms_orders_recommended oor
        JOIN 
            min_rop_base mr
        ON 
            mr.article = oor.article AND mr.loc_code = oor.loc_code
        LEFT JOIN 
            oms.article_status_tag ast
        ON 
            oor.product_code = ast.product_code AND oor.size = ast.size
        WHERE 
            oor.order_gen_type != ''Manual'' 
            and oor.order_status_id != 3
            and oor.rop = mr.min_rop
    )
    --select * from min_rop_helper where rop = min_rop;

    ,recommended_min_rop as materialized (
    select * from min_rop_helper ' || v_size_search_cls || '
    )
    --select * from recommended_min_rop;

    ,paf_kpi_oor AS materialized (
            SELECT 

                paf.l1_name,
                paf.l0_name,
                paf.l2_name,
                ok.store_inv,
                ok.dc_inv,
                ok.system_inv,
                ok.safety_stock,
                ok.open_receipt_units,
                oor.*
            from
                recommended_min_rop oor
            inner join 
                (SELECT l1_name, l0_name, l2_name, product_code FROM global.product_attributes_filter
                ' || v_pa_sql || '
                ) paf
                on oor.product_code = paf.product_code 
            LEFT JOIN
                oms.oms_kpi ok
            ON 
                paf.product_code = ok.product_code AND oor.loc_code = ok.loc_code 
            join (select * from global.distribution_centres where is_active and not is_deleted) dc 
            on dc.linked_store_code = oor.loc_code
        )

    ,alerts_expedite AS materialized (
        SELECT DISTINCT
            loc_code,
            product_code
        FROM oms.oms_alerts
        WHERE expedite_order = TRUE
          ' || CASE WHEN v_filter_reviewed_orders THEN ' AND NOT is_expedite_order_resolved = TRUE' ELSE '' END || '
    )
        
    ,distinct_po_counts AS materialized (
        SELECT 
        po.loc_code,
        po.product_code,
        SUM(po.oo) + SUM(po.it) AS commited_receipt_units,
        COUNT(DISTINCT po.po_id) AS distinct_po_count
    FROM 
        oms.oms_po_master po  
    INNER JOIN 
        alerts_expedite ae
    ON 
        ae.loc_code = po.loc_code 
        AND ae.product_code = po.product_code
    INNER JOIN 
        recommended_min_rop mrh 
    ON 
        po.loc_code = mrh.loc_code 
        AND po.product_code = mrh.product_code
    WHERE 
        po.projected_delivery_date > CURRENT_DATE + INTERVAL ''14 days''
       AND po.projected_delivery_date BETWEEN (COALESCE(mrh.recom_receipt_date, NOW()) - INTERVAL ''12 weeks'')
                                           AND COALESCE(mrh.earliest_receipt_date, mrh.order_cycle_receipt_date)
    GROUP BY 
        po.loc_code, po.product_code
    )
    --select * from distinct_po_counts

    select * from (

        SELECT 
        
            alerts.article, -- 1
            alerts.loc_code, -- 2 
            
            MAX(COALESCE(alerts.is_expedite_order_resolved, FALSE)::INT)::BOOLEAN AS is_resolved,
            sum(coalesce(pko.store_inv, 0)) as store_inv, --6
            sum(coalesce(pko.dc_inv, 0)) as dc_inv, --7
            concat(alerts.article, alerts.loc_code) as unique_row_id,
            concat(alerts.article, alerts.loc_code) as id,
            sum(coalesce(historic_sales_unit, 0)) as historic_sales_unit, --4
            sum(coalesce(historic_sales_value, 0)) as historic_sales_value, --5
            sum(coalesce(po.commited_receipt_units, 0)) as commited_receipt_units, -- 8
            sum(coalesce(pko.system_inv, 0)) as total_inv, -- 9
            max(pko.order_placement_recom_date) as order_placement_recom_date, --10
            max(pko.expected_receipt_date) as expected_receipt_date, --11  
            max(coalesce(po.distinct_po_count, 0)) as distinct_po_count, --12
            sum(coalesce(alerts.lost_sales_aggregated_unit, 0)) as lost_sales_agg, --13
            sum(coalesce(pko.lost_sales_agg_cost, 0)) as lost_sales_agg_cost, --14
            avg(coalesce(alerts.dc_wos_oh_oo_it, 0)) as dc_wos_oh_oo_it, --15
            avg(alerts.dc_store_wos_oh_oo_it) as dc_store_wos_oh_oo_it, --16
            sum(coalesce(alerts.potential_sales_unit, 0)) as potential_sales_unit,  --18
            sum(coalesce(alerts.potential_sales_value, 0)) as potential_sales_value,  --18

            max(alerts.receipt_date_earliest) as receipt_date_earliest,
            max(alerts.order_placement_date_earliest) as order_placement_date_earliest,
            sum(coalesce(alerts.raw_roq_earliest, 0)) as raw_roq_earliest,
            sum(coalesce(alerts.roq_unconstrained_earliest, 0)) as roq_unconstrained_earliest,
            sum(coalesce(alerts.date_diff, 0)) as date_diff,

            avg(coalesce(pko.order_quantity, 0)) as order_quantity,
			sum(coalesce(pko.order_quantity_eaches, 0)) as order_quantity_eaches,
            CASE 
                WHEN MAX(opc.article) IS NOT NULL THEN ''View Pack Config''
                ELSE ''-''
            END AS pack_id,
            sum(coalesce(pko.order_cost, 0)) as order_cost,
            sum(coalesce(pko.raw_roq, 0)) as raw_roq,
            sum(coalesce(pko.ia_shipment_order_quantity, 0)) as ia_shipment_order_quantity,
            sum(coalesce(pko.roq_unconstrained, 0)) as roq_unconstrained,
            sum(coalesce(pko.roq_constrained, 0)) as roq_constrained,
            max(pko.recom_receipt_date) as recom_receipt_date,
            sum(coalesce(pko.safety_stock_deficit, 0)) as safety_stock_deficit,
            ARRAY_AGG(
            jsonb_build_object(
                ''size'', alerts.size, -- 3
                ''historic_sales_unit'', historic_sales_unit, --4
                ''historic_sales_value'', historic_sales_value, --5
                ''loc_code'', alerts.loc_code,
                ''article'', alerts.article,
                ''store_inv'', pko.store_inv, --6
                ''dc_inv'', pko.dc_inv, --7,
                ''total_inv'', pko.system_inv, -- 9
                ''order_quantity'', pko.order_quantity,
				''order_quantity_eaches'', pko.order_quantity_eaches,
                ''order_cost'', pko.order_cost,
                ''raw_roq'', pko.raw_roq,
                ''ia_shipment_order_quantity'', pko.ia_shipment_order_quantity,
                ''roq_unconstrained'', pko.roq_unconstrained,
                ''roq_constrained'', pko.roq_constrained,
                ''recom_receipt_date'', pko.recom_receipt_date,
                ''safety_stock_deficit'', pko.safety_stock_deficit,

                ''receipt_date_earliest'', alerts.receipt_date_earliest,
                ''order_placement_date_earliest'', alerts.order_placement_date_earliest,
                ''raw_roq_earliest'', alerts.raw_roq_earliest,
                ''roq_unconstrained_earliest'', alerts.roq_unconstrained_earliest,
                ''date_diff'', alerts.date_diff,

                ''commited_receipt_units'', po.commited_receipt_units, -- 8
                ''order_placement_recom_date'', pko.order_placement_recom_date, --10
                ''expected_receipt_date'', pko.expected_receipt_date, --11
                ''distinct_po_count'', po.distinct_po_count, --12
                ''lost_sales_agg'', alerts.lost_sales_aggregated_unit, --13
                ''lost_sales_agg_cost'', pko.lost_sales_agg_cost, --14
                ''potential_sales_unit'', alerts.potential_sales_unit, --18
                ''potential_sales_value'', alerts.potential_sales_value --19
            ) ' || v_size_sort_cls || '
        ) AS product_details

        FROM 
            oms.oms_alerts alerts
        INNER JOIN
            paf_kpi_oor pko
        ON 
            alerts.article = pko.article AND alerts.loc_code = pko.loc_code and pko.product_code = alerts.product_code
        left join 
            distinct_po_counts po
        on pko.product_code = po.product_code  and pko.loc_code = po.loc_code
        LEFT JOIN (
            SELECT DISTINCT article
            FROM oms.oms_pack_config
        ) opc
        ON opc.article = pko.article
        WHERE    alerts.expedite_order 
        ' || CASE WHEN v_filter_reviewed_orders THEN ' and not alerts.is_expedite_order_resolved = true' ELSE '' END || ' 
        group by alerts.article, alerts.loc_code ) X
    ' || v_search_cls || '
    ' || v_sort_cls || '
    ' || v_limit_cls;
     

    -- Debugging SQL
    RAISE NOTICE 'v_expedite_orders_sql: %', v_expedite_orders_sql;

    -- Open the cursor and execute the query
    OPEN $1 FOR EXECUTE v_expedite_orders_sql;
    RETURN $1;
END;
$function$
;
